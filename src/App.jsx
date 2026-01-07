import React, { useState, useRef, forwardRef } from 'react';
import { Download, Plus, Trash2, AlertTriangle, FileImage, X, FileText, Euro, Printer, User, Wrench, Layout, CheckSquare } from 'lucide-react';

// --- PRIJZEN CONFIGURATIE (Gebaseerd op PDF documentatie) ---
const PRIJZEN = {
  basisPerMeter: 1350, // Geupdate basisprijs
  startTarief: 1500,
  types: {
    draai: 350,
    kiep: 400,
    kiepdraai: 550,
    vast: 150,
    dicht: 0
  },
  opties: {
    rooster: 150, // Bron: PDF Page 6
    rolluik: 750, // Schatting obv "Prijs op aanvraag"
    hor: 115,     // Bron: PDF Page 11 (3 stuks 345 -> 115 p/s)
    keralitUpgrade: 650, // Bron: PDF Page 6 (per dakkapel)
    afvoerenSloop: 680,  // Bron: PDF Page 6
    afvoerenPannen: 195, // Bron: PDF Page 6
    constructieVerzwaren: 200 // Bron: PDF Page 6 (tbv zonnepanelen)
  }
};

// --- CONFIGURATIE & CONSTANTEN ---
const CONFIG = {
  offset: 200, 
  colors: {
    bg: '#ffffff',
    stroke: '#000000',
    glass: '#e0f2fe', 
    frame: '#ffffff', 
    sash: '#ffffff', 
    panel: '#d1d5db', 
    shutter: '#9ca3af', 
    vent: '#f3f4f6', 
    highlight: '#ef4444', 
  }
};

// --- HULP COMPONENTEN VOOR TEKENINGEN ---
const SectieTekening = ({ x, y, breedte, hoogte, kozijnDikte, type, draairichting, opties }) => {
  const RAAMHOUT_DIKTE = 50; 
  const binnenBreedte = breedte - (kozijnDikte * 2);
  const binnenHoogte = hoogte - (kozijnDikte * 2);
  const frameContentX = x + kozijnDikte;
  const frameContentY = y + kozijnDikte;
  const isOpenable = ['draai', 'kiep', 'kiepdraai'].includes(type);
  
  let glassX = frameContentX;
  let glassY = frameContentY;
  let glassW = binnenBreedte;
  let glassH = binnenHoogte;

  if (isOpenable) {
    glassX += RAAMHOUT_DIKTE;
    glassY += RAAMHOUT_DIKTE;
    glassW -= (RAAMHOUT_DIKTE * 2);
    glassH -= (RAAMHOUT_DIKTE * 2);
  }

  const midX = glassX + (glassW / 2);
  const shutterHeight = 180; 
  const ventHeight = 80; 

  if (opties.rooster) {
    glassY += ventHeight;
    glassH -= ventHeight;
  }

  return (
    <g>
      <rect x={x} y={y} width={breedte} height={hoogte} 
            fill={type === 'dicht' ? CONFIG.colors.panel : CONFIG.colors.frame} 
            stroke={CONFIG.colors.stroke} strokeWidth="1" />

      {isOpenable && (
        <rect x={frameContentX} y={frameContentY} width={binnenBreedte} height={binnenHoogte}
              fill={CONFIG.colors.sash}
              stroke={CONFIG.colors.stroke} strokeWidth="1" />
      )}

      {type !== 'dicht' && (
        <rect x={glassX} y={glassY} width={glassW} height={glassH} 
              fill={CONFIG.colors.glass} fillOpacity="0.4"
              stroke={CONFIG.colors.stroke} strokeWidth="1.5" />
      )}

      {type !== 'dicht' && opties.rooster && (
        <g>
          <rect x={glassX} y={glassY - ventHeight} width={glassW} height={ventHeight}
                fill={CONFIG.colors.vent} stroke={CONFIG.colors.stroke} strokeWidth="1" />
          <line x1={glassX + 10} y1={glassY - ventHeight/2} x2={glassX + glassW - 10} y2={glassY - ventHeight/2} stroke="#999" strokeWidth="1" />
        </g>
      )}

      {type === 'vast' && (
        <g stroke="#9ca3af" strokeWidth="1" strokeDasharray="10,10">
          <line x1={glassX} y1={glassY} x2={glassX + glassW} y2={glassY + glassH} />
          <line x1={glassX + glassW} y1={glassY} x2={glassX} y2={glassY + glassH} />
        </g>
      )}

      {(type === 'draai' || type === 'kiepdraai') && (
        <g stroke={CONFIG.colors.stroke} strokeWidth="1.5" strokeDasharray="20,10">
          {draairichting === 'rechts' ? (
             <polyline points={`${glassX + glassW},${glassY} ${glassX},${glassY + glassH/2} ${glassX + glassW},${glassY + glassH}`} fill="none"/>
          ) : (
             <polyline points={`${glassX},${glassY} ${glassX + glassW},${glassY + glassH/2} ${glassX},${glassY + glassH}`} fill="none"/>
          )}
        </g>
      )}

      {(type === 'kiep' || type === 'kiepdraai') && (
        <polyline 
          points={`${glassX},${glassY + glassH} ${midX},${glassY} ${glassX + glassW},${glassY + glassH}`} 
          fill="none" stroke={CONFIG.colors.stroke} strokeWidth="1.5" strokeDasharray="20,10"
        />
      )}

      {opties.rolluik && (
        <g>
          <rect x={x} y={y} width={breedte} height={shutterHeight} 
                fill={CONFIG.colors.shutter} stroke={CONFIG.colors.stroke} strokeWidth="1" />
          <line x1={x} y1={y + shutterHeight - 10} x2={x + breedte} y2={y + shutterHeight - 10} stroke="#6b7280" strokeWidth="1" />
        </g>
      )}

      {opties.hor && (
        <text x={x + breedte / 2} y={y + hoogte - 20} textAnchor="middle" fontSize="40" fontWeight="bold" fill="#15803d">H</text>
      )}
    </g>
  );
};

// --- DE HOOFD TEKENING (CANVAS) ---
const DakkapelTekening = forwardRef(({ maten, secties, berekendeTotaalBreedte, isValid }, ref) => {
  const totaalConstructieBreedte = berekendeTotaalBreedte + maten.overhangLinks + maten.overhangRechts;
  const viewBoxWidth = totaalConstructieBreedte + (CONFIG.offset * 2);
  const viewBoxHeight = maten.totaalHoogte + (CONFIG.offset * 2);

  const startX = CONFIG.offset + maten.overhangLinks;
  const startY = CONFIG.offset;

  const sectieHoogte = maten.totaalHoogte - maten.bovenpaneelHoogte - maten.dorpelHoogte;
  const sectieStartX = startX + maten.zijpaneelBreedte;
  const sectieStartY = startY + maten.bovenpaneelHoogte;
  const totaleSectieBreedte = secties.reduce((sum, s) => sum + s.breedte, 0);

  return (
    <svg 
      ref={ref}
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} 
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full bg-white shadow-sm"
      style={{ maxHeight: '600px' }} 
    >
      <rect width={viewBoxWidth} height={viewBoxHeight} fill="#f8fafc" />
      
      <text x={viewBoxWidth/2} y={100} textAnchor="middle" fontSize="60" fontWeight="bold" fill="#333">
        Dakkapel Specificatie
      </text>

      <g>
        <rect x={startX - maten.overhangLinks} y={startY} width={berekendeTotaalBreedte + maten.overhangLinks + maten.overhangRechts} height={maten.bovenpaneelHoogte} fill="white" stroke="black" strokeWidth="2" />
        <rect x={startX} y={startY + maten.bovenpaneelHoogte} width={maten.zijpaneelBreedte} height={maten.totaalHoogte - maten.bovenpaneelHoogte} fill="white" stroke="black" strokeWidth="2" />
        <rect x={startX + berekendeTotaalBreedte - maten.zijpaneelBreedte} y={startY + maten.bovenpaneelHoogte} width={maten.zijpaneelBreedte} height={maten.totaalHoogte - maten.bovenpaneelHoogte} fill="white" stroke="black" strokeWidth="2" />

        {secties.map((sectie, index) => {
          const previousWidths = secties.slice(0, index).reduce((sum, s) => sum + s.breedte, 0);
          const currentX = sectieStartX + previousWidths;
          const currentY = sectieStartY;

          return (
            <React.Fragment key={index}>
              <SectieTekening 
                x={currentX}
                y={currentY}
                breedte={sectie.breedte}
                hoogte={sectieHoogte}
                kozijnDikte={maten.kozijnDikte}
                type={sectie.type}
                draairichting={sectie.draairichting}
                opties={{ rooster: sectie.rooster, rolluik: sectie.rolluik, hor: sectie.hor }}
              />
              <text x={currentX + sectie.breedte/2} y={currentY + sectieHoogte + maten.dorpelHoogte + 80} 
                    textAnchor="middle" fontSize="30" fill="#333">{sectie.breedte}</text>
              <line x1={currentX} y1={currentY + sectieHoogte + maten.dorpelHoogte + 50} 
                    x2={currentX + sectie.breedte} y2={currentY + sectieHoogte + maten.dorpelHoogte + 50} stroke="black" />
            </React.Fragment>
          );
        })}

        <rect x={sectieStartX} y={sectieStartY} width={totaleSectieBreedte} height={sectieHoogte} fill="none" stroke="black" strokeWidth="3" />
        <rect x={startX + maten.zijpaneelBreedte} y={startY + maten.totaalHoogte - maten.dorpelHoogte} width={berekendeTotaalBreedte - (maten.zijpaneelBreedte * 2)} height={maten.dorpelHoogte} fill="white" stroke="black" strokeWidth="2" />

        <line x1={startX} y1={startY + maten.totaalHoogte + 150} x2={startX + berekendeTotaalBreedte} y2={startY + maten.totaalHoogte + 150} stroke="black" strokeWidth="2" />
        <line x1={startX} y1={startY + maten.totaalHoogte + 140} x2={startX} y2={startY + maten.totaalHoogte + 160} stroke="black" strokeWidth="2" />
        <line x1={startX + berekendeTotaalBreedte} y1={startY + maten.totaalHoogte + 140} x2={startX + berekendeTotaalBreedte} y2={startY + maten.totaalHoogte + 160} stroke="black" strokeWidth="2" />

        <text x={startX + berekendeTotaalBreedte/2} y={startY + maten.totaalHoogte + 130} 
              textAnchor="middle" fontSize="40" fontWeight="bold" fill={isValid ? '#000' : '#ef4444'}>
          {isValid ? maten.totaalBreedte : `${berekendeTotaalBreedte} (Let op!)`}
        </text>

        <line x1={startX + berekendeTotaalBreedte + 150} y1={startY} x2={startX + berekendeTotaalBreedte + 150} y2={startY + maten.totaalHoogte} stroke="black" strokeWidth="2" />
        <line x1={startX + berekendeTotaalBreedte + 140} y1={startY} x2={startX + berekendeTotaalBreedte + 160} y2={startY} stroke="black" strokeWidth="2" />
        <line x1={startX + berekendeTotaalBreedte + 140} y1={startY + maten.totaalHoogte} x2={startX + berekendeTotaalBreedte + 160} y2={startY + maten.totaalHoogte} stroke="black" strokeWidth="2" />
              
        <text x={startX + berekendeTotaalBreedte + 190} y={startY + maten.totaalHoogte/2} 
              transform={`rotate(90, ${startX + berekendeTotaalBreedte + 190}, ${startY + maten.totaalHoogte/2})`}
              textAnchor="middle" fontSize="40" fontWeight="bold" fill="#000">
          {maten.totaalHoogte}
        </text>
      </g>
    </svg>
  );
});
DakkapelTekening.displayName = 'DakkapelTekening';


// --- HOOFD APPLICATIE ---
export default function DakkapelDesigner() {
  const svgRef = useRef(null);
  const [activeTab, setActiveTab] = useState('ontwerp'); // ontwerp, materialen, gegevens

  // Staat voor Formulier velden (Gebaseerd op PDF Page 1)
  const [clientData, setClientData] = useState({
    datum: new Date().toISOString().split('T')[0],
    naam: '',
    straat: '',
    postcode: '',
    plaats: '',
    telefoon: '',
    mobiel: '',
    email: '',
    geboortedatum: ''
  });

  const [situationData, setSituationData] = useState({
    bouwdepot: 'Nee',
    plaatsVoordeur: 'Rechts',
    serre: 'Nee',
    radiatoren: 'Nee',
    rookkanaal: 'Nee',
    schoorsteen: 'Nee',
    binnenkantSlopen: 'Nee',
    sloopOudeDakkapel: 'Nee',
    grintOpDak: 'Nee',
    bereikbaarheidKraan: 'Ja',
    vanuitNok: 'Nee',
    vanuitGoot: 'Nee',
    busroute: 'Nee',
    zonnepanelen: 'Nee',
    vergunningNodig: 'Ja',
    bsnNummer: '',
    diepteWoning: '',
    hoogteBeganeGrond: '',
    hoogteEersteVerdieping: '',
    hoogteNok: ''
  });

  const [materialData, setMaterialData] = useState({
    materiaal: 'Kunststof', // Kunststof, Aluminium, Hout
    kleur: 'Wit',
    kozijnProfiel: 'Verdiept', // Verdiept, Vlak
    kozijnKleur: 'Houtnerf', // Houtnerf, Glad
    zijwangen: 'Trespa', // Trespa, Keralit, Zink, Lood
    boeideel: 'Trespa', // Trespa, Keralit
    daktrim: 'Aluminium', // Aluminium, Kraal
    dakbedekking: 'Bitumen', // Bitumen, EPDM
    kleurZijwangen: 'Antraciet (RAL 7016)',
    kleurBoeideel: 'Antraciet (RAL 7016)',
    kleurDraaikiep: 'Wit (RAL 9016)'
  });

  const [maten, setMaten] = useState({
    totaalBreedte: 3570,
    totaalHoogte: 1750,
    zijpaneelBreedte: 210,
    bovenpaneelHoogte: 300,
    dorpelHoogte: 300, 
    overhangLinks: 100,
    overhangRechts: 100,
    kozijnDikte: 60,
    dakhelling: 45
  });

  const [secties, setSecties] = useState([
    { type: 'draai', breedte: 800, draairichting: 'rechts', rooster: false, rolluik: false, hor: false },
    { type: 'dicht', breedte: 1550, rooster: false, rolluik: false, hor: false },
    { type: 'draai', breedte: 800, draairichting: 'links', rooster: false, rolluik: false, hor: false }
  ]);

  // --- CALCULATIES ---
  const sectiesTotaalBreedte = secties.reduce((sum, s) => sum + s.breedte, 0);
  const berekendeTotaalBreedte = sectiesTotaalBreedte + (maten.zijpaneelBreedte * 2);
  const isMaatValid = Math.abs(berekendeTotaalBreedte - maten.totaalBreedte) < 2;

  // --- PRIJS BEREKENING ---
  const berekenTotaalPrijs = () => {
    // 1. Breedte kosten
    const breedtePrijs = (maten.totaalBreedte / 1000) * PRIJZEN.basisPerMeter;
    
    // 2. Starttarief (zijwangen etc)
    let totaal = breedtePrijs + PRIJZEN.startTarief;

    // 3. Sectie kosten (types + opties)
    secties.forEach(sectie => {
      // Meerprijs type raam
      totaal += (PRIJZEN.types[sectie.type] || 0);
      
      // Opties
      if (sectie.rooster) totaal += PRIJZEN.opties.rooster;
      if (sectie.rolluik) totaal += PRIJZEN.opties.rolluik;
      if (sectie.hor) totaal += PRIJZEN.opties.hor;
    });

    // 4. Materiaal & Situatie opslagen (Gebaseerd op PDF Page 6)
    if (materialData.zijwangen === 'Keralit' || materialData.boeideel === 'Keralit') {
        totaal += PRIJZEN.opties.keralitUpgrade;
    }
    if (situationData.sloopOudeDakkapel === 'Ja') {
        totaal += PRIJZEN.opties.afvoerenSloop; // + evt sloopkosten zelf (niet gespecificeerd in var, nemen we samen)
    }
    if (situationData.zonnepanelen === 'Ja') {
        totaal += PRIJZEN.opties.constructieVerzwaren;
    }

    return totaal;
  };

  const totaalPrijs = berekenTotaalPrijs();


  // --- HANDLERS ---
  const handleMaatChange = (key, value) => {
    setMaten(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  const handleClientChange = (key, value) => {
    setClientData(prev => ({ ...prev, [key]: value }));
  };

  const handleSituationChange = (key, value) => {
    setSituationData(prev => ({ ...prev, [key]: value }));
  };

  const handleMaterialChange = (key, value) => {
    setMaterialData(prev => ({ ...prev, [key]: value }));
  };

  const handleSectieChange = (index, key, value) => {
    const newSecties = [...secties];
    let updates = { [key]: value };
    
    if (key === 'type' && (value === 'draai' || value === 'kiepdraai')) {
      if (!newSecties[index].draairichting) {
        updates.draairichting = 'rechts';
      }
    }

    newSecties[index] = { ...newSecties[index], ...updates };
    setSecties(newSecties);
  };

  const addSectie = () => {
    setSecties([...secties, { type: 'draai', breedte: 800, draairichting: 'rechts', rooster: false, rolluik: false, hor: false }]);
  };

  const removeSectie = (index) => {
    if (secties.length > 1) setSecties(secties.filter((_, i) => i !== index));
  };

  const getSvgAsImage = async () => {
    if (!svgRef.current) return null;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const img = new Image();
    const base64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    img.src = base64;
    return new Promise((resolve) => {
       img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = svgRef.current.viewBox.baseVal.width;
        canvas.height = svgRef.current.viewBox.baseVal.height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
       }
    });
  }

  const handleDownload = async (format) => {
    if (!svgRef.current) return;
    
    if (format === 'svg') {
       const svgData = new XMLSerializer().serializeToString(svgRef.current);
       const blob = new Blob([svgData], { type: 'image/svg+xml' });
       const url = URL.createObjectURL(blob);
       const link = document.createElement('a');
       link.href = url; link.download = `dakkapel-${clientData.naam || 'ontwerp'}.svg`; link.click();
       URL.revokeObjectURL(url);
    } else if (format === 'png') {
       const imgData = await getSvgAsImage();
       if(imgData) {
         const link = document.createElement('a');
         link.download = `dakkapel-${clientData.naam || 'ontwerp'}.png`;
         link.href = imgData; link.click();
       }
    }
  };

  const handleDownloadOfferteHTML = async () => {
    const imgData = await getSvgAsImage();
    
    // Genereer HTML gebaseerd op PDF structuur
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="nl">
      <head>
        <meta charset="UTF-8">
        <title>Offerte ${clientData.naam}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { font-family: 'Helvetica', 'Arial', sans-serif; -webkit-print-color-adjust: exact; font-size: 12px; }
          .table-header { background-color: #f3f4f6; font-weight: bold; border-bottom: 2px solid #000; }
          .section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; color: #1e3a8a; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body class="bg-gray-100 p-8">
        <div class="max-w-5xl mx-auto bg-white p-12 shadow-lg print:shadow-none print:p-0">
          
          <!-- HEADER (Page 1 Style) -->
          <div class="flex justify-between items-start mb-8">
            <div class="w-1/2">
                <h1 class="text-3xl font-bold text-gray-900 uppercase">Zolderverbouw Larenstein</h1>
                <p class="text-gray-500 italic">Voor úw complete zolderverbouwing</p>
                <div class="mt-4 text-sm">
                    P.C. Staalweg 10<br>
                    3721 TJ Bilthoven<br>
                    Tel: 030-272 06 42<br>
                    info@zolderverbouwlarenstein.nl
                </div>
            </div>
            <div class="w-1/2 text-right">
                <div class="border p-4 inline-block text-left bg-gray-50 text-sm">
                    <strong>Offertenummer:</strong> 2025-${Math.floor(Math.random() * 1000)}<br>
                    <strong>Datum:</strong> ${clientData.datum}<br>
                    <strong>Klant:</strong> ${clientData.naam}<br>
                    <strong>Plaats:</strong> ${clientData.plaats}
                </div>
            </div>
          </div>

          <!-- CLIENT DATA TABLE (Based on Page 1 form) -->
          <div class="mb-8">
            <h2 class="section-title">Klantgegevens & Locatie</h2>
            <div class="grid grid-cols-2 gap-4">
               <div>
                  <table class="w-full text-sm">
                    <tr><td class="w-32 font-bold">Naam:</td><td>${clientData.naam}</td></tr>
                    <tr><td class="font-bold">Adres:</td><td>${clientData.straat}</td></tr>
                    <tr><td class="font-bold">Postcode/Plaats:</td><td>${clientData.postcode} ${clientData.plaats}</td></tr>
                    <tr><td class="font-bold">Telefoon:</td><td>${clientData.telefoon}</td></tr>
                  </table>
               </div>
               <div>
                  <table class="w-full text-sm">
                    <tr><td class="w-32 font-bold">E-mail:</td><td>${clientData.email}</td></tr>
                    <tr><td class="font-bold">Geboortedatum:</td><td>${clientData.geboortedatum}</td></tr>
                    <tr><td class="font-bold">Datum Opname:</td><td>${clientData.datum}</td></tr>
                  </table>
               </div>
            </div>
          </div>

          <!-- MATERIAL SPECIFICATION (Based on Page 1 & 5) -->
          <div class="mb-8">
            <h2 class="section-title">Materialen & Uitvoering</h2>
            <table class="w-full border-collapse border border-gray-300 text-sm">
                <tr class="bg-gray-100"><th class="border p-2 text-left" colspan="4">Specificaties</th></tr>
                <tr>
                    <td class="border p-2 font-bold w-1/4">Materiaal Dakkapel</td><td class="border p-2 w-1/4">${materialData.materiaal}</td>
                    <td class="border p-2 font-bold w-1/4">Kleur Kozijn</td><td class="border p-2 w-1/4">${materialData.kleur} (${materialData.kozijnKleur})</td>
                </tr>
                <tr>
                    <td class="border p-2 font-bold">Zijwangen</td><td class="border p-2">${materialData.zijwangen} (${materialData.kleurZijwangen})</td>
                    <td class="border p-2 font-bold">Draaikiepramen</td><td class="border p-2">${materialData.kleurDraaikiep}</td>
                </tr>
                 <tr>
                    <td class="border p-2 font-bold">Boeideel</td><td class="border p-2">${materialData.boeideel} (${materialData.kleurBoeideel})</td>
                    <td class="border p-2 font-bold">Daktrim</td><td class="border p-2">${materialData.daktrim}</td>
                </tr>
                <tr>
                    <td class="border p-2 font-bold">Dakbedekking</td><td class="border p-2">${materialData.dakbedekking}</td>
                    <td class="border p-2 font-bold">Hellingshoek</td><td class="border p-2">${maten.dakhelling} graden</td>
                </tr>
            </table>
          </div>

          <!-- CHECKLIST (Based on Page 1 "Algemene Informatie") -->
          <div class="mb-8 break-inside-avoid">
            <h2 class="section-title">Situatie & Checklist</h2>
            <div class="grid grid-cols-3 gap-2 text-xs border p-2 rounded">
                ${Object.entries(situationData).map(([key, value]) => {
                    if(['bsnNummer', 'diepteWoning', 'hoogteBeganeGrond', 'hoogteEersteVerdieping', 'hoogteNok'].includes(key)) return '';
                    return `<div class="flex justify-between border-b py-1"><span>${key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span> <strong>${value}</strong></div>`;
                }).join('')}
            </div>
          </div>

          <!-- TECHNISCHE TEKENING -->
          <div class="mb-8 break-inside-avoid">
            <h2 class="section-title">Technisch Aanzicht</h2>
            <div class="border rounded-lg p-4 flex justify-center bg-gray-50">
              <img src="${imgData}" style="max-height: 350px; width: auto;" />
            </div>
            <div class="text-xs text-center mt-2 text-gray-500">
               Breedte: ${maten.totaalBreedte}mm | Hoogte: ${maten.totaalHoogte}mm
            </div>
          </div>

          <!-- PRIJSOPGAVE (Based on Page 6) -->
          <div class="mb-8">
            <h2 class="section-title">Prijsopgave</h2>
            <table class="w-full text-sm text-left border-collapse">
              <thead class="bg-gray-100 border-b-2 border-gray-800">
                <tr>
                  <th class="p-2">Omschrijving</th>
                  <th class="p-2 text-right">Bedrag</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-b">
                    <td class="p-2">Basis Dakkapel (Afm: ${maten.totaalBreedte}x${maten.totaalHoogte}) inclusief plaatsing en constructie</td>
                    <td class="p-2 text-right">€ ${(maten.totaalBreedte / 1000 * PRIJZEN.basisPerMeter + PRIJZEN.startTarief).toLocaleString('nl-NL', {minimumFractionDigits: 2})}</td>
                </tr>
                ${secties.map((sectie, idx) => {
                  let subTotaal = (PRIJZEN.types[sectie.type] || 0);
                  let desc = `Sectie ${idx+1}: ${sectie.type}`;
                  if (sectie.rooster) { subTotaal += PRIJZEN.opties.rooster; desc += " + rooster"; }
                  if (sectie.rolluik) { subTotaal += PRIJZEN.opties.rolluik; desc += " + rolluik"; }
                  if (sectie.hor) { subTotaal += PRIJZEN.opties.hor; desc += " + hor"; }
                  
                  if(subTotaal > 0) {
                      return `
                        <tr class="border-b">
                          <td class="p-2 pl-6 text-gray-600">${desc}</td>
                          <td class="p-2 text-right">€ ${subTotaal.toLocaleString('nl-NL', {minimumFractionDigits: 2})}</td>
                        </tr>`;
                  }
                  return '';
                }).join('')}

                ${materialData.zijwangen === 'Keralit' ? `<tr class="border-b"><td class="p-2">Meerprijs Keralit bekleding</td><td class="p-2 text-right">€ ${PRIJZEN.opties.keralitUpgrade.toLocaleString('nl-NL', {minimumFractionDigits:2})}</td></tr>` : ''}
                ${situationData.sloopOudeDakkapel === 'Ja' ? `<tr class="border-b"><td class="p-2">Afvoeren sloopmateriaal & pannen</td><td class="p-2 text-right">€ ${(PRIJZEN.opties.afvoerenSloop + PRIJZEN.opties.afvoerenPannen).toLocaleString('nl-NL', {minimumFractionDigits:2})}</td></tr>` : ''}
              </tbody>
              <tfoot>
                <tr class="font-bold text-lg bg-gray-50">
                    <td class="p-2 text-right border-t-2 border-black">Totaal (inclusief 21% BTW):</td>
                    <td class="p-2 text-right border-t-2 border-black">€ ${totaalPrijs.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div class="text-xs text-gray-500 mt-8 border-t pt-4">
             <p>Op al onze overeenkomsten zijn de algemene voorwaarden van toepassing. Betaling 100% op dag van plaatsing.</p>
             <p>Garanties: 15 jaar constructie, 10 jaar kozijnen, 10 jaar dakbedekking.</p>
          </div>
          
          <div class="mt-12 text-center no-print">
            <button onclick="window.print()" class="bg-blue-600 text-white px-6 py-3 rounded font-bold hover:bg-blue-700 transition cursor-pointer">
              Opslaan als PDF
            </button>
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Offerte-${clientData.naam.replace(/\s+/g, '-') || 'Concept'}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-2 lg:p-6 font-sans print:bg-white print:p-0">
      
      {/* UI HEADER */}
      <header className="max-w-7xl mx-auto mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200 no-print">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded">
                <Layout size={24} />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dakkapel Configurator</h1>
                <p className="text-xs text-gray-500">Zolderverbouw Larenstein</p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="text-2xl font-bold text-blue-600 flex items-center gap-1">
               <Euro size={24} /> {totaalPrijs.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex gap-2">
                <button onClick={() => handleDownload('png')} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-50 border border-gray-300 rounded hover:bg-gray-100 transition-colors">
                  <FileImage size={14} /> PNG
                </button>
                <button onClick={handleDownloadOfferteHTML} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded hover:bg-green-700 transition-colors shadow-sm">
                  <FileText size={16} /> Download Offerte
                </button>
            </div>
          </div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6 no-print">
        
        {/* SIDEBAR TABS */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
            
            {/* Tab Navigatie */}
            <div className="flex bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <button onClick={() => setActiveTab('ontwerp')} className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'ontwerp' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <Layout size={16} /> Ontwerp
                </button>
                <button onClick={() => setActiveTab('materialen')} className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'materialen' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <Wrench size={16} /> Materialen
                </button>
                <button onClick={() => setActiveTab('gegevens')} className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'gegevens' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <User size={16} /> Gegevens
                </button>
            </div>

            {/* TAB CONTENT: ONTWERP */}
            {activeTab === 'ontwerp' && (
                <div className="space-y-4 animate-fadeIn">
                     {!isMaatValid && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
                            <div className="flex items-center gap-2 text-red-700 font-bold mb-1"><AlertTriangle size={20} /><span>Maatvoering klopt niet!</span></div>
                            <div className="text-sm text-red-600">
                            <p>Totaal opgegeven: {maten.totaalBreedte}mm | Berekend: {berekendeTotaalBreedte}mm</p>
                            </div>
                        </div>
                    )}
                    
                    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                        <h2 className="text-sm font-bold text-gray-800 uppercase mb-3 border-b pb-2">Hoofdmaten (mm)</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {['totaalBreedte', 'totaalHoogte', 'zijpaneelBreedte', 'bovenpaneelHoogte'].map(key => (
                            <div key={key}>
                                <label className="text-xs text-gray-500 block mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                                <input type="number" value={maten[key]} onChange={(e) => handleMaatChange(key, e.target.value)} 
                                    className="w-full p-2 border rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                            </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-3 border-b pb-2">
                            <h2 className="text-sm font-bold text-gray-800 uppercase">Indeling</h2>
                            <button onClick={addSectie} className="flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200"><Plus size={14} /> Toevoegen</button>
                        </div>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                            {secties.map((sectie, idx) => (
                            <div key={idx} className="bg-gray-50 p-3 rounded border border-gray-200 relative">
                                <button onClick={() => removeSectie(idx)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                                <span className="text-xs font-bold text-gray-400 mb-2 block">SECTIE {idx + 1}</span>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <select value={sectie.type} onChange={(e) => handleSectieChange(idx, 'type', e.target.value)} className="w-full p-1.5 text-sm border rounded bg-white">
                                        <option value="draai">Draairaam</option>
                                        <option value="kiep">Kiep</option>
                                        <option value="kiepdraai">Kiep-Draai</option>
                                        <option value="vast">Vast glas</option>
                                        <option value="dicht">Paneel</option>
                                    </select>
                                    <input type="number" value={sectie.breedte} onChange={(e) => handleSectieChange(idx, 'breedte', parseFloat(e.target.value))} className="w-full p-1.5 text-sm border rounded" placeholder="Breedte" />
                                </div>
                                {(sectie.type === 'draai' || sectie.type === 'kiepdraai') && (
                                     <div className="mb-2">
                                        <select value={sectie.draairichting} onChange={(e) => handleSectieChange(idx, 'draairichting', e.target.value)} className="w-full p-1.5 text-sm border rounded bg-white">
                                            <option value="rechts">Rechts draaiend</option>
                                            <option value="links">Links draaiend</option>
                                        </select>
                                    </div>
                                )}
                                {sectie.type !== 'dicht' && (
                                    <div className="flex gap-3 mt-2 pt-2 border-t border-gray-200">
                                        {['rooster', 'rolluik', 'hor'].map(opt => (
                                            <label key={opt} className="flex items-center gap-1 cursor-pointer">
                                                <input type="checkbox" checked={sectie[opt]} onChange={(e) => handleSectieChange(idx, opt, e.target.checked)} className="rounded text-blue-600" />
                                                <span className="text-xs text-gray-600 capitalize">{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: MATERIALEN */}
            {activeTab === 'materialen' && (
                <div className="space-y-4 animate-fadeIn">
                    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                        <h2 className="text-sm font-bold text-gray-800 uppercase mb-3 border-b pb-2">Materialen & Kleuren</h2>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-1">Materiaal & Kleur Kozijn</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <select value={materialData.materiaal} onChange={(e) => handleMaterialChange('materiaal', e.target.value)} className="p-2 border rounded text-sm bg-white">
                                        <option value="Kunststof">Kunststof</option>
                                        <option value="Hout">Hout</option>
                                        <option value="Aluminium">Aluminium</option>
                                    </select>
                                    <select value={materialData.kleur} onChange={(e) => handleMaterialChange('kleur', e.target.value)} className="p-2 border rounded text-sm bg-white">
                                        <option value="Wit">Wit (9016)</option>
                                        <option value="Creme">Crème (9001)</option>
                                        <option value="Antraciet">Antraciet (7016)</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-1">Bekleding Zijwangen</label>
                                <select value={materialData.zijwangen} onChange={(e) => handleMaterialChange('zijwangen', e.target.value)} className="w-full p-2 border rounded text-sm bg-white mb-2">
                                    <option value="Trespa">Trespa (Standaard)</option>
                                    <option value="Keralit">Keralit (Meerprijs)</option>
                                    <option value="Zink">Zink</option>
                                    <option value="Red Cedar">Red Cedar</option>
                                </select>
                                <input type="text" value={materialData.kleurZijwangen} onChange={(e) => handleMaterialChange('kleurZijwangen', e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="Kleur (bijv. RAL 7016)" />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-1">Dakafwerking</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <select value={materialData.dakbedekking} onChange={(e) => handleMaterialChange('dakbedekking', e.target.value)} className="p-2 border rounded text-sm bg-white">
                                        <option value="Bitumen">Bitumen</option>
                                        <option value="EPDM">EPDM</option>
                                    </select>
                                     <select value={materialData.daktrim} onChange={(e) => handleMaterialChange('daktrim', e.target.value)} className="p-2 border rounded text-sm bg-white">
                                        <option value="Aluminium">Alu Trim</option>
                                        <option value="Kraal">Kraal</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: GEGEVENS */}
            {activeTab === 'gegevens' && (
                <div className="space-y-4 animate-fadeIn">
                     <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                        <h2 className="text-sm font-bold text-gray-800 uppercase mb-3 border-b pb-2">Klantgegevens</h2>
                        <div className="space-y-2">
                            <input type="text" placeholder="Naam" value={clientData.naam} onChange={(e) => handleClientChange('naam', e.target.value)} className="w-full p-2 border rounded text-sm" />
                            <input type="text" placeholder="Straat + Huisnr" value={clientData.straat} onChange={(e) => handleClientChange('straat', e.target.value)} className="w-full p-2 border rounded text-sm" />
                            <div className="grid grid-cols-3 gap-2">
                                <input type="text" placeholder="Postcode" value={clientData.postcode} onChange={(e) => handleClientChange('postcode', e.target.value)} className="col-span-1 p-2 border rounded text-sm" />
                                <input type="text" placeholder="Plaats" value={clientData.plaats} onChange={(e) => handleClientChange('plaats', e.target.value)} className="col-span-2 p-2 border rounded text-sm" />
                            </div>
                            <input type="email" placeholder="E-mail" value={clientData.email} onChange={(e) => handleClientChange('email', e.target.value)} className="w-full p-2 border rounded text-sm" />
                            <input type="text" placeholder="Telefoon" value={clientData.telefoon} onChange={(e) => handleClientChange('telefoon', e.target.value)} className="w-full p-2 border rounded text-sm" />
                        </div>
                     </div>

                     <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                        <h2 className="text-sm font-bold text-gray-800 uppercase mb-3 border-b pb-2">Situatie Checklist</h2>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                            {[
                                {k: 'bouwdepot', l: 'Bouwdepot?'}, 
                                {k: 'sloopOudeDakkapel', l: 'Sloop oude dakkapel?'},
                                {k: 'zonnepanelen', l: 'Zonnepanelen aanwezig?'},
                                {k: 'vergunningNodig', l: 'Vergunning nodig?'},
                                {k: 'bereikbaarheidKraan', l: 'Kraan bereikbaar?'},
                                {k: 'grintOpDak', l: 'Grint op dak?'}
                            ].map((item) => (
                                <div key={item.k} className="flex justify-between items-center text-sm border-b border-gray-100 pb-1">
                                    <span className="text-gray-600">{item.l}</span>
                                    <select value={situationData[item.k]} onChange={(e) => handleSituationChange(item.k, e.target.value)} className="bg-gray-50 border rounded p-1 text-xs">
                                        <option value="Ja">Ja</option>
                                        <option value="Nee">Nee</option>
                                    </select>
                                </div>
                            ))}
                        </div>
                     </div>
                </div>
            )}

        </div>

        {/* VISUALISATIE (MAIN) */}
        <div className="col-span-12 lg:col-span-8">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 sticky top-6">
              <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center text-xs text-gray-500 font-mono">
                <span>PREVIEW MODE: VECTOR</span>
                <span>{berekendeTotaalBreedte}mm x {maten.totaalHoogte}mm</span>
              </div>
              <div className="p-4 bg-gray-100 flex items-center justify-center min-h-[400px] lg:min-h-[600px] overflow-auto">
                <DakkapelTekening ref={svgRef} maten={maten} secties={secties} berekendeTotaalBreedte={berekendeTotaalBreedte} isValid={isMaatValid} />
              </div>
            </div>
        </div>

      </div>
    </div>
  );
}