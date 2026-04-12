import { format } from 'date-fns'

function nombreEnLettres(n) {
  const u = ['','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf']
  const d = ['','','vingt','trente','quarante','cinquante','soixante','soixante','quatre-vingt','quatre-vingt']
  if (n === 0) return 'zéro'
  function c(nb) {
    if (nb === 0) return ''
    if (nb < 20) return u[nb]
    if (nb < 100) { const dz=Math.floor(nb/10),un=nb%10; if(dz===7)return'soixante-'+u[10+un]; if(dz===9)return'quatre-vingt-'+(un===0?'':u[un]); return d[dz]+(un===1&&dz!==8?'-et-':un>0?'-':'')+u[un] }
    if (nb < 1000) { const ce=Math.floor(nb/100),r=nb%100; return(ce===1?'cent':u[ce]+'-cent')+(r>0?'-'+c(r):'') }
    const m=Math.floor(nb/1000),r=nb%1000; return(m===1?'mille':c(m)+'-mille')+(r>0?'-'+c(r):'')
  }
  const ent=Math.floor(n), cts=Math.round((n-ent)*100)
  let res=c(ent).toUpperCase(); if(res)res+=' DIRHAMS'; if(cts>0)res+=' ET '+c(cts).toUpperCase()+' CENTIMES'
  return res
}

function QRCode({ value, size=80 }) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`
  return <img src={url} alt="QR" style={{ width:size, height:size, display:'block' }} />
}

const SOCIETE = {
  nom:       'Ijtihad Gaz',
  adresse:   'N° 67 LOT BLED SI THAMI 2ème étage Zemamra',
  tel:       '06 67 33 70 73',
  ice:       '003104207000037',
}

function trierLignes(lignes) {
  return [...lignes].sort((a, b) => {
    const score = (nom) => {
      nom = (nom||'').toLowerCase()
      if (nom.includes('12')) return 0
      if (nom.includes('6')) return 1
      if (nom.includes('3')) return 2
      if (nom.includes('bng')) return 3
      if (nom.includes('propane')) return 4
      return 5
    }
    return score(a.produits?.nom) - score(b.produits?.nom)
  })
}

function getConditionLabel(val) {
  return { immediat:'Règlement immédiat', quinzaine:'Quinzaine', mensuel:'Mensuel', trimestre:'Trimestriel' }[val] || val || 'Règlement immédiat'
}

const S = {
  page: { fontFamily:'Arial,sans-serif', fontSize:12, color:'#000', background:'#fff', padding:'20px 28px', minHeight:'260mm', display:'flex', flexDirection:'column' },
  TH: { border:'1.5px solid #000', padding:'8px 10px', background:'#e8e8e8', fontWeight:700, textAlign:'center', fontSize:12, color:'#000' },
  TD: { border:'1px solid #000', padding:'8px 10px', fontSize:12, color:'#000', height:34 },
  TDC: { border:'1px solid #000', padding:'8px 10px', fontSize:12, color:'#000', textAlign:'center', height:34 },
  TDR: { border:'1px solid #000', padding:'8px 10px', fontSize:12, color:'#000', textAlign:'right', height:34 },
}

function SocieteBloc() {
  return (
    <div style={{ border:'1.5px solid #000', padding:'10px 14px' }}>
      <div style={{ fontWeight:900, fontSize:16, textDecoration:'underline', color:'#000', marginBottom:4 }}>{SOCIETE.nom}</div>
      <div style={{ fontSize:11, color:'#000', lineHeight:1.8 }}>
        <div>Tél : {SOCIETE.tel}</div>
        <div>ICE : {SOCIETE.ice}</div>
      </div>
    </div>
  )
}

function ClientBloc({ client, label='LIVRÉ À :' }) {
  return (
    <div style={{ border:'1.5px solid #000', padding:'10px 14px' }}>
      <div style={{ fontWeight:700, fontSize:11, textTransform:'uppercase', marginBottom:4, color:'#000' }}>{label}</div>
      <div style={{ fontWeight:700, color:'#000', fontSize:13 }}>{client?.nom_societe || client?.nom}</div>
      {client?.telephone && <div style={{ fontSize:11, color:'#000' }}>Tél : {client.telephone}</div>}
      {client?.ice && <div style={{ fontSize:11, color:'#000' }}>ICE : {client.ice}</div>}
    </div>
  )
}

function DocFooter() {
  return (
    <div style={{ borderTop:'1px solid #aaa', marginTop:'auto', paddingTop:8, textAlign:'center', fontSize:10, color:'#555', lineHeight:1.7 }}>
      {SOCIETE.nom} &nbsp;·&nbsp; {SOCIETE.adresse} &nbsp;·&nbsp; TEL : {SOCIETE.tel} &nbsp;·&nbsp; ICE : {SOCIETE.ice}
    </div>
  )
}

function DocModal({ titre, onClose, children, isDuplicata }) {

  function handleDownload() {
    const el = document.getElementById('doc-content')
    if (!el) return
    if (window.html2pdf) {
      doDownload(el)
    } else {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
      script.onload = () => doDownload(el)
      document.head.appendChild(script)
    }
  }

  function doDownload(el) {
    const filename = titre.replace(/[^a-zA-Z0-9-_]/g, '_') + '.pdf'
    window.html2pdf().set({
      margin: 5,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(el).save()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth:820, background:'white', color:'#000', maxHeight:'90vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header noprint" style={{ background:'white', borderBottom:'1px solid #e5e7eb', position:'sticky', top:0, zIndex:10 }}>
          <h3 style={{ color:'#111' }}>{titre.replace('_DUPLICATA','')}</h3>
          <div className="flex gap-2">
            <button className="btn btn-primary btn-sm" onClick={handleDownload}>⬇ Télécharger</button>
            <button className="btn btn-ghost btn-sm" style={{ color:'#666' }} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Contenu */}
        <div id="doc-content" style={{ ...S.page, position:'relative' }}>
          {isDuplicata && (
            <div style={{
              position:'absolute',
              top:0, left:0, width:'100%', height:'100%',
              pointerEvents:'none',
              zIndex:0,
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
            }}>
              <span style={{
                display:'block',
                transform:'rotate(-45deg)',
                fontSize:88,
                fontWeight:900,
                color:'#c0c0c0',
                opacity:0.25,
                fontFamily:'Arial,sans-serif',
                letterSpacing:6,
                whiteSpace:'nowrap',
                userSelect:'none',
              }}>DUPLICATA</span>
            </div>
          )}
          <div style={{ position:'relative', zIndex:1 }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════
// BON DE LIVRAISON
// ═══════════════════════════════════
export function PrintBL({ bl, commande, lignes, client, livreur, onClose }) {
  const date = bl?.date_creation ? format(new Date(bl.date_creation),'dd/MM/yyyy') : format(new Date(),'dd/MM/yyyy')
  const condition = getConditionLabel(commande?.condition_paiement || client?.condition_paiement)
  const lignesTri = trierLignes(lignes)
  const qrData = `BL:${bl?.numero_bl}|CMD:${commande?.numero_commande}|CLIENT:${client?.nom}`

  return (
    <DocModal titre={`BL-${bl?.numero_bl}`} onClose={onClose}>
      <div style={{ textAlign:'center', marginBottom:20 }}>
        <div style={{ display:'inline-block', background:'#1a5c8a', color:'white', padding:'8px 40px', fontWeight:700, fontSize:15, letterSpacing:2 }}>
          BON DE LIVRAISON
        </div>
        <div style={{ display:'flex', justifyContent:'center', gap:32, marginTop:8, fontSize:12 }}>
          <span><strong>N° :</strong> {bl?.numero_bl}</span>
          <span><strong>Date :</strong> {date}</span>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        <div><div style={{ fontWeight:700, fontSize:11, textTransform:'uppercase', marginBottom:4 }}>FACTURÉ À :</div><SocieteBloc /></div>
        <div><ClientBloc client={client} label="LIVRÉ À :" /></div>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#000', marginBottom:12, padding:'5px 0', borderTop:'1px solid #ddd', borderBottom:'1px solid #ddd' }}>
        {commande?.numero_commande && <div><strong>Commande N° :</strong> {commande.numero_commande} du {date}</div>}
        <div><strong>Conditions de paiement :</strong> {condition.toUpperCase()}</div>
      </div>

      <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:16 }}>
        <thead>
          <tr><th style={{ ...S.TH, width:'70%' }}>PRODUIT</th><th style={{ ...S.TH }}>QUANTITÉ</th></tr>
        </thead>
        <tbody>
          {lignesTri.map((l,i) => (
            <tr key={i}><td style={S.TD}>{l.produits?.nom?.toUpperCase()}</td><td style={S.TDC}>{l.quantite}</td></tr>
          ))}
        </tbody>
      </table>

      {livreur && (
        <div style={{ fontSize:12, color:'#000', marginBottom:16, padding:'8px 12px', border:'1px solid #ddd', borderRadius:4 }}>
          <strong>Véhicule :</strong> {livreur.immatriculation}
          &nbsp;&nbsp;&nbsp;<strong>Livreur :</strong> {livreur.prenom} {livreur.nom}
          {livreur.telephone && <span> &nbsp;·&nbsp; Tél : {livreur.telephone}</span>}
          {livreur.cin && <span> &nbsp;·&nbsp; CIN : {livreur.cin}</span>}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:16, marginTop:16, alignItems:'end' }}>
        <div>
          <div style={{ fontSize:11, color:'#555', marginBottom:4 }}>Signature Réceptionnaire :</div>
          <div style={{ border:'1px solid #999', height:70 }}></div>
        </div>
        <div>
          <div style={{ fontSize:11, color:'#555', marginBottom:4 }}>Signature Chauffeur :</div>
          <div style={{ border:'1px solid #999', height:70 }}></div>
        </div>
        <div style={{ textAlign:'center' }}>
          <QRCode value={qrData} size={80} />
          <div style={{ fontSize:10, color:'#444', marginTop:2 }}>GED: {bl?.numero_bl}</div>
        </div>
      </div>
      <DocFooter />
    </DocModal>
  )
}

// ═══════════════════════════════════
// BON DE COMMANDE
// ═══════════════════════════════════
export function PrintBC({ commande, lignes, client, tva=10, onClose }) {
  const lignesTri = trierLignes(lignes)
  const totalTTC = lignesTri.reduce((s,l) => s + l.quantite * l.prix_unitaire, 0)
  const totalHT = totalTTC / (1 + tva/100)
  const montantTVA = totalTTC - totalHT
  const date = commande?.created_at ? format(new Date(commande.created_at),'dd/MM/yyyy HH:mm') : format(new Date(),'dd/MM/yyyy')
  const qrData = `BC:${commande?.numero_commande}|CLIENT:${client?.nom}|TOTAL:${totalTTC.toFixed(2)}`

  return (
    <DocModal titre={`BC-${commande?.numero_commande}`} onClose={onClose}>
      <div style={{ textAlign:'center', marginBottom:20 }}>
        <div style={{ display:'inline-block', background:'#1a5c8a', color:'white', padding:'8px 40px', fontWeight:700, fontSize:15, letterSpacing:2 }}>
          BON DE COMMANDE
        </div>
        <div style={{ display:'flex', justifyContent:'center', gap:32, marginTop:8, fontSize:12 }}>
          <span><strong>N° :</strong> {commande?.numero_commande}</span>
          <span><strong>Date :</strong> {date}</span>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
        <SocieteBloc />
        <ClientBloc client={client} label="CLIENT :" />
      </div>

      <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:20 }}>
        <thead>
          <tr>
            <th style={{ ...S.TH, width:'34%' }}>Description</th>
            <th style={{ ...S.TH, width:'14%' }}>Quantité</th>
            <th style={{ ...S.TH, width:'18%' }}>Prix unitaire</th>
            <th style={{ ...S.TH, width:'18%' }}>Taxes</th>
            <th style={{ ...S.TH, width:'16%' }}>Prix Total</th>
          </tr>
        </thead>
        <tbody>
          {lignesTri.map((l,i) => (
            <tr key={i}>
              <td style={S.TD}>{l.produits?.nom?.toUpperCase()}</td>
              <td style={S.TDC}>{l.quantite}</td>
              <td style={S.TDR}>{Number(l.prix_unitaire).toFixed(2)} DH</td>
              <td style={S.TDC}>TVA {tva}%</td>
              <td style={S.TDR}>{(l.quantite*l.prix_unitaire).toFixed(2)} DH</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:20 }}>
        <table style={{ borderCollapse:'collapse' }}>
          <tbody>
            <tr><td style={{ border:'1px solid #000', padding:'6px 12px', fontWeight:600, background:'#f5f5f5', fontSize:12 }}>Montant HT</td><td style={{ border:'1px solid #000', padding:'6px 12px', textAlign:'right', minWidth:120, fontSize:12 }}>{totalHT.toFixed(2)} DH</td></tr>
            <tr><td style={{ border:'1px solid #000', padding:'6px 12px', fontWeight:600, background:'#f5f5f5', fontSize:12 }}>TVA {tva}%</td><td style={{ border:'1px solid #000', padding:'6px 12px', textAlign:'right', fontSize:12 }}>{montantTVA.toFixed(2)} DH</td></tr>
            <tr><td style={{ border:'1px solid #000', padding:'6px 12px', fontWeight:700, background:'#e8e8e8', fontSize:12 }}>Total TTC</td><td style={{ border:'1px solid #000', padding:'6px 12px', textAlign:'right', fontWeight:700, background:'#e8e8e8', fontSize:12 }}>{totalTTC.toFixed(2)} DH</td></tr>
          </tbody>
        </table>
      </div>

      <div style={{ fontSize:12, color:'#000', marginBottom:20, padding:'8px 0', borderTop:'1px solid #eee' }}>
        <strong>Conditions de règlement :</strong> {getConditionLabel(commande?.condition_paiement)}
        &nbsp;&nbsp;|&nbsp;&nbsp;
        <strong>Mode :</strong> {commande?.mode_reglement === 'cheque' ? 'Chèque' : 'Espèces'}
      </div>

      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'auto' }}>
        <div style={{ textAlign:'center' }}>
          <QRCode value={qrData} size={70} />
          <div style={{ fontSize:10, color:'#444', marginTop:2 }}>GED: {commande?.numero_commande}</div>
        </div>
      </div>
      <DocFooter />
    </DocModal>
  )
}

// ═══════════════════════════════════
// FACTURE
// ═══════════════════════════════════
export function PrintFacture({ facture, bl, commande, lignes, client, tva=10, isDuplicata=false, onClose }) {
  const lignesTri = trierLignes(lignes)
  const totalTTC = lignesTri.reduce((s,l) => s + l.quantite * l.prix_unitaire, 0)
  const totalHT = totalTTC / (1 + tva/100)
  const montantTVA = totalTTC - totalHT
  const dateF = facture?.date_facture ? format(new Date(facture.date_facture),'dd/MM/yyyy') : format(new Date(),'dd/MM/yyyy')
  const condition = getConditionLabel(commande?.condition_paiement || client?.condition_paiement)
  const qrData = `FACT:${facture?.numero_facture}|BL:${bl?.numero_bl}|CLIENT:${client?.nom}|TOTAL:${totalTTC.toFixed(2)}`
  const titre = isDuplicata ? `Facture-${facture?.numero_facture}_DUPLICATA` : `Facture-${facture?.numero_facture}`

  return (
    <DocModal titre={titre} isDuplicata={isDuplicata} onClose={onClose}>
      <div style={{ textAlign:'center', marginBottom:20 }}>
        <div style={{ display:'inline-block', background:'#1a5c8a', color:'white', padding:'8px 40px', fontWeight:700, fontSize:15, letterSpacing:2 }}>
          FACTURE
        </div>
        <div style={{ display:'flex', justifyContent:'center', gap:32, marginTop:8, fontSize:12 }}>
          <span><strong>N° :</strong> {facture?.numero_facture}</span>
          <span><strong>Date :</strong> {dateF}</span>
          {bl && <span><strong>Réf. BL :</strong> {bl.numero_bl}</span>}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
        <SocieteBloc />
        <ClientBloc client={client} label="FACTURÉ À :" />
      </div>

      <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:16 }}>
        <thead>
          <tr>
            <th style={{ ...S.TH, width:'45%' }}>DÉSIGNATION</th>
            <th style={{ ...S.TH, width:'15%' }}>QUANTITÉ</th>
            <th style={{ ...S.TH, width:'20%' }}>P.U. TTC</th>
            <th style={{ ...S.TH, width:'20%' }}>MONTANT</th>
          </tr>
        </thead>
        <tbody>
          {lignesTri.map((l,i) => (
            <tr key={i}>
              <td style={S.TD}>{l.produits?.nom?.toUpperCase()}</td>
              <td style={S.TDC}>{l.quantite}</td>
              <td style={S.TDR}>{Number(l.prix_unitaire).toFixed(2)}</td>
              <td style={S.TDR}>{(l.quantite*l.prix_unitaire).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
        <table style={{ borderCollapse:'collapse' }}>
          <tbody>
            <tr><td style={{ border:'1px solid #000', padding:'6px 12px', fontWeight:600, background:'#f5f5f5', fontSize:12, minWidth:130 }}>TOTAL HT</td><td style={{ border:'1px solid #000', padding:'6px 12px', textAlign:'right', minWidth:120, fontSize:12 }}>{totalHT.toFixed(2)}</td></tr>
            <tr><td style={{ border:'1px solid #000', padding:'6px 12px', fontWeight:600, background:'#f5f5f5', fontSize:12 }}>TVA {tva} %</td><td style={{ border:'1px solid #000', padding:'6px 12px', textAlign:'right', fontSize:12 }}>{montantTVA.toFixed(2)}</td></tr>
            <tr><td style={{ border:'1px solid #000', padding:'6px 12px', fontWeight:700, background:'#e8e8e8', fontSize:12 }}>TOTAL TTC</td><td style={{ border:'1px solid #000', padding:'6px 12px', textAlign:'right', fontWeight:700, background:'#e8e8e8', fontSize:12 }}>{totalTTC.toFixed(2)}</td></tr>
          </tbody>
        </table>
      </div>

      <div style={{ fontSize:11, marginBottom:6 }}><strong>Arrêtée à la somme de :</strong> {nombreEnLettres(totalTTC)}</div>
      <div style={{ fontSize:11, marginBottom:14 }}>
        <strong>Conditions de règlement :</strong> {condition}
        &nbsp;&nbsp;|&nbsp;&nbsp;
        <strong>Mode :</strong> {commande?.mode_reglement === 'cheque' ? 'Chèque' : 'Espèces'}
      </div>

      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'auto' }}>
        <div style={{ textAlign:'center' }}>
          <QRCode value={qrData} size={70} />
          <div style={{ fontSize:10, color:'#444', marginTop:2 }}>GED: {facture?.numero_facture}</div>
          <div style={{ fontSize:10, color:'#444' }}>Exemplaire Client</div>
        </div>
      </div>
      <DocFooter />
    </DocModal>
  )
}

// ═══════════════════════════════════════════
// DEVIS
// ═══════════════════════════════════════════
export function PrintDevis({ numero, date, validite, client, lignes, tva = 10, notes, onClose }) {
  const totalTTC   = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0)
  const totalHT    = totalTTC / (1 + tva / 100)
  const montantTVA = totalTTC - totalHT
  const dateF      = date ? format(new Date(date), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy')
  const dateExp    = format(new Date(new Date(date || new Date()).getTime() + validite * 24 * 60 * 60 * 1000), 'dd/MM/yyyy')
  const lignesTri  = trierLignes(lignes)

  return (
    <DocModal titre={`Devis — ${numero}`} onClose={onClose}>
      {/* TITRE */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ display: 'inline-block', background: '#7c3aed', color: 'white', padding: '10px 40px', fontWeight: 700, fontSize: 16, letterSpacing: 2 }}>
          DEVIS
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 10, fontSize: 12 }}>
          <span><strong>N° :</strong> {numero}</span>
          <span><strong>Date :</strong> {dateF}</span>
          <span><strong>Valable jusqu'au :</strong> {dateExp}</span>
        </div>
      </div>

      {/* Infos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <SocieteBloc />
        {client ? (
          <ClientBloc client={client} label="DESTINATAIRE :" />
        ) : (
          <div style={{ border: '1.5px solid #ddd', padding: '10px 14px' }}>
            <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', marginBottom: 6, color: '#999' }}>DESTINATAIRE :</div>
            <div style={{ color: '#aaa', fontSize: 12 }}>Non spécifié</div>
          </div>
        )}
      </div>

      {/* Tableau */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr>
            <th style={{ ...S.TH, width: '45%' }}>DÉSIGNATION</th>
            <th style={{ ...S.TH, width: '15%' }}>QTÉ</th>
            <th style={{ ...S.TH, width: '20%' }}>P.U. TTC</th>
            <th style={{ ...S.TH, width: '20%' }}>MONTANT</th>
          </tr>
        </thead>
        <tbody>
          {lignesTri.map((l, i) => (
            <tr key={i}>
              <td style={S.TD}>{l.nom?.toUpperCase()}</td>
              <td style={S.TDC}>{l.quantite}</td>
              <td style={S.TDR}>{Number(l.prix_unitaire).toFixed(2)}</td>
              <td style={S.TDR}>{(l.quantite * l.prix_unitaire).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totaux */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            <tr><td style={{ border: '1px solid #000', padding: '7px 14px', textAlign: 'right', fontWeight: 600, minWidth: 140, background: '#f5f5f5', fontSize: 12, color: '#000' }}>TOTAL HT</td><td style={{ border: '1px solid #000', padding: '7px 14px', textAlign: 'right', minWidth: 130, fontSize: 12, color: '#000' }}>{totalHT.toFixed(2)}</td></tr>
            <tr><td style={{ border: '1px solid #000', padding: '7px 14px', textAlign: 'right', fontWeight: 600, background: '#f5f5f5', fontSize: 12, color: '#000' }}>TVA {tva}%</td><td style={{ border: '1px solid #000', padding: '7px 14px', textAlign: 'right', fontSize: 12, color: '#000' }}>{montantTVA.toFixed(2)}</td></tr>
            <tr><td style={{ border: '1px solid #000', padding: '7px 14px', textAlign: 'right', fontWeight: 700, background: '#e8e8e8', fontSize: 12, color: '#000' }}>TOTAL TTC</td><td style={{ border: '1px solid #000', padding: '7px 14px', textAlign: 'right', fontWeight: 700, background: '#e8e8e8', fontSize: 12, color: '#000' }}>{totalTTC.toFixed(2)}</td></tr>
          </tbody>
        </table>
      </div>

      {/* Conditions */}
      <div style={{ padding: '10px 14px', background: '#f9f9f9', border: '1px solid #e0e0e0', borderRadius: 6, marginBottom: 12, fontSize: 11, color: '#444', lineHeight: 1.8 }}>
        <div style={{ fontWeight: 700, marginBottom: 4, color: '#000' }}>Conditions :</div>
        <div>• Les prix indiqués sont en Dirhams TTC (TVA {tva}% incluse).</div>
        <div>• Des remises peuvent être négociées à partir de certaines quantités — contactez-nous.</div>
        {notes && <div>• {notes}</div>}
        <div>• Ce devis est valable {validite} jours à compter du {dateF}.</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: 8 }}>
        <div style={{ textAlign: 'center' }}>
          <QRCode value={`DEVIS:${numero}|TOTAL:${totalTTC.toFixed(2)}`} size={70} />
          <div style={{ fontSize: 10, color: '#444', marginTop: 3 }}>GED: {numero}</div>
        </div>
      </div>

      <DocFooter />
    </DocModal>
  )
}
