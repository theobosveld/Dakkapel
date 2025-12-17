import React, { useState, useRef, forwardRef } from 'react';
import { Download, Plus, Trash2, AlertTriangle, FileImage, X, FileText, Euro, Printer } from 'lucide-react';

// --- PRIJZEN CONFIGURATIE (Dummy prijzen voor voorbeeld) ---
const PRIJZEN = {
  basisPerMeter: 1250, // Prijs per meter breedte (casco)
  startTarief: 1500,   // Vaste kosten (zijwangen, constructie, plaatsing)
  types: {
    draai: 350,       // Meerprijs t.o.v. basis
    kiep: 400,
    kiepdraai: 550,
    vast: 150,
    dicht: 0
  },
  opties: {
    rooster: 125,
    rolluik: 695,
    hor: 145
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
          <line x1={glassX + 10} y1={glassY - ventHeight/3} x2={glassX + glassW - 10} y2={glassY - ventHeight/3} stroke="#999" strokeWidth="1" />
          <line x1={glassX + 10} y1={glassY - (ventHeight/3)*2} x2={glassX + glassW - 10} y2={glassY - (ventHeight/3)*2} stroke="#999" strokeWidth="1" />
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

  const [maten, setMaten] = useState({
    totaalBreedte: 3570,
    totaalHoogte: 1750,
    zijpaneelBreedte: 210,
    bovenpaneelHoogte: 300,
    dorpelHoogte: 300, 
    overhangLinks: 100,
    overhangRechts: 100,
    kozijnDikte: 60
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

    return totaal;
  };

  const totaalPrijs = berekenTotaalPrijs();


  // --- HANDLERS ---
  const handleMaatChange = (key, value) => {
    setMaten(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
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
       link.href = url; link.download = `dakkapel-${Date.now()}.svg`; link.click();
       URL.revokeObjectURL(url);
    } else if (format === 'png') {
       const imgData = await getSvgAsImage();
       if(imgData) {
         const link = document.createElement('a');
         link.download = `dakkapel-${Date.now()}.png`;
         link.href = imgData; link.click();
       }
    }
  };

  const handleDownloadOfferteHTML = async () => {
    const imgData = await getSvgAsImage();
    
    // Bereken totalen voor opties (ter informatie)
    let totalOpties = 0;
    secties.forEach(s => {
       if (s.rooster) totalOpties += PRIJZEN.opties.rooster;
       if (s.rolluik) totalOpties += PRIJZEN.opties.rolluik;
       if (s.hor) totalOpties += PRIJZEN.opties.hor;
    });
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="nl">
      <head>
        <meta charset="UTF-8">
        <title>Offerte Dakkapel</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { font-family: sans-serif; -webkit-print-color-adjust: exact; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body class="bg-gray-100 p-8">
        <div class="max-w-4xl mx-auto bg-white p-8 shadow-lg">
          <div class="flex justify-between items-center border-b pb-6 mb-6">
            <div>
              <h1 class="text-3xl font-bold text-gray-900">Offerte Dakkapel</h1>
              <p class="text-gray-500">Datum: ${new Date().toLocaleDateString('nl-NL')}</p>
            </div>
            <div class="text-right">
              <div class="text-sm text-gray-500">Offerte kenmerk</div>
              <div class="font-mono font-bold text-lg">#${Math.floor(Math.random() * 10000)}</div>
            </div>
          </div>

          <div class="mb-8">
            <h2 class="text-xl font-bold mb-4 text-blue-600">Technisch Ontwerp</h2>
            <div class="border rounded-lg p-4 flex justify-center bg-gray-50">
              <img src="${imgData}" style="max-height: 400px; width: auto;" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 class="font-bold border-b pb-2 mb-2">Afmetingen</h3>
              <div class="grid grid-cols-2 gap-2 text-sm">
                <div class="text-gray-600">Breedte:</div><div>${maten.totaalBreedte} mm</div>
                <div class="text-gray-600">Hoogte:</div><div>${maten.totaalHoogte} mm</div>
                <div class="text-gray-600">Zijwangen:</div><div>${maten.zijpaneelBreedte} mm</div>
                <div class="text-gray-600">Boeideel:</div><div>${maten.bovenpaneelHoogte} mm</div>
              </div>
            </div>
            <div>
              <h3 class="font-bold border-b pb-2 mb-2">Specificaties</h3>
              <div class="text-sm text-gray-600">
                Materiaal: Kunststof (HPL)<br>
                Kleur: Wit (RAL 9016)<br>
                Glas: HR++ Isolatieglas<br>
                RC-waarde: 6.0
              </div>
            </div>
          </div>

          <div class="mb-8">
            <h3 class="font-bold mb-4">Samenstelling</h3>
            <table class="w-full text-sm text-left">
              <thead class="bg-gray-50 text-gray-700">
                <tr>
                  <th class="p-2 border-b">Positie</th>
                  <th class="p-2 border-b">Type</th>
                  <th class="p-2 border-b">Afmeting</th>
                  <th class="p-2 border-b">Opties</th>
                  <th class="p-2 border-b text-right">Prijs</th>
                </tr>
              </thead>
              <tbody>
                ${secties.map((sectie, idx) => {
                  let prijs = (PRIJZEN.types[sectie.type] || 0);
                  if (sectie.rooster) prijs += PRIJZEN.opties.rooster;
                  if (sectie.rolluik) prijs += PRIJZEN.opties.rolluik;
                  if (sectie.hor) prijs += PRIJZEN.opties.hor;
                  
                  let opts = [];
                  if (sectie.rooster) opts.push("Rooster");
                  if (sectie.rolluik) opts.push("Rolluik");
                  if (sectie.hor) opts.push("Hor");
                  
                  return `
                    <tr class="border-b last:border-0">
                      <td class="p-2">Sectie ${idx + 1}</td>
                      <td class="p-2 capitalize">${sectie.type}</td>
                      <td class="p-2">${sectie.breedte} mm</td>
                      <td class="p-2 text-gray-500">${opts.join(', ') || '-'}</td>
                      <td class="p-2 text-right">€ ${prijs.toLocaleString('nl-NL', {minimumFractionDigits: 2})}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <div class="flex justify-end border-t-2 border-gray-900 pt-4">
            <div class="text-right">
              <div class="text-2xl font-bold text-blue-600">
                Totaal: € ${totaalPrijs.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
              </div>
              <div class="text-xs text-gray-500 mt-1">Inclusief BTW & Montage</div>
            </div>
          </div>
          
          <div class="mt-12 text-center no-print">
            <button onclick="window.print()" class="bg-blue-600 text-white px-6 py-3 rounded font-bold hover:bg-blue-700 transition cursor-pointer">
              Print / Opslaan als PDF
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
    link.download = `Offerte-Dakkapel-${Date.now()}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // --- NATIVE PRINT FUNCTIE ---
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 lg:p-8 font-sans print:bg-white print:p-0">
      
      {/* PRINT STYLES - Alleen zichtbaar tijdens printen */}
      <style>{`
        @media print {
          @page { size: landscape; margin: 1cm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .print-layout { display: block !important; width: 100%; }
          .print-header { margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        }
        .print-only { display: none; }
      `}</style>

      {/* PRINTBARE OFFERTE PAGINA (Zichtbaar op print) */}
      <div className="print-only">
        <div className="print-header flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Offerte Dakkapel</h1>
            <p className="text-gray-600">Datum: {new Date().toLocaleDateString('nl-NL')}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold">Totaalprijs: € {totaalPrijs.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</h2>
            <p className="text-sm text-gray-500">Incl. BTW & Montage</p>
          </div>
        </div>

        {/* Tekening in print */}
        <div className="border border-gray-300 p-4 mb-8 bg-white rounded">
           <div className="h-[400px] flex justify-center items-center">
             <span className="text-sm text-gray-400 italic">Zie technische tekening hieronder</span>
           </div>
        </div>

        {/* Specificaties Tabel */}
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4">Specificaties</h3>
          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
             <div><strong>Breedte:</strong> {maten.totaalBreedte} mm</div>
             <div><strong>Hoogte:</strong> {maten.totaalHoogte} mm</div>
             <div><strong>Zijwangen:</strong> {maten.zijpaneelBreedte} mm</div>
             <div><strong>Boeideel:</strong> {maten.bovenpaneelHoogte} mm</div>
          </div>

          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-800">
                <th className="py-2">Sectie</th>
                <th className="py-2">Type</th>
                <th className="py-2">Afmeting</th>
                <th className="py-2">Opties</th>
                <th className="py-2 text-right">Meerprijs</th>
              </tr>
            </thead>
            <tbody>
              {secties.map((sectie, idx) => {
                let sectiePrijs = (PRIJZEN.types[sectie.type] || 0);
                if (sectie.rooster) sectiePrijs += PRIJZEN.opties.rooster;
                if (sectie.rolluik) sectiePrijs += PRIJZEN.opties.rolluik;
                if (sectie.hor) sectiePrijs += PRIJZEN.opties.hor;
                
                let optiesLijst = [];
                if (sectie.rooster) optiesLijst.push("Rooster");
                if (sectie.rolluik) optiesLijst.push("Rolluik");
                if (sectie.hor) optiesLijst.push("Hor");

                return (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="py-2">Sectie {idx + 1}</td>
                    <td className="py-2 capitalize">{sectie.type}</td>
                    <td className="py-2">{sectie.breedte} mm</td>
                    <td className="py-2">{optiesLijst.join(', ') || '-'}</td>
                    <td className="py-2 text-right">€ {sectiePrijs.toLocaleString('nl-NL')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* REGULIERE UI (Verberg tijdens printen) */}
      <div className="max-w-7xl mx-auto no-print">
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dakkapel Configurator</h1>
            <p className="text-gray-500">Ontwerp en exporteer technische tekeningen</p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="text-2xl font-bold text-blue-600 flex items-center gap-1">
               <Euro size={24} /> {totaalPrijs.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex gap-2">
                <button onClick={() => handleDownload('png')} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors">
                  <FileImage size={14} /> PNG
                </button>
                <button onClick={() => handleDownload('svg')} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors">
                  <Download size={14} /> SVG
                </button>
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors shadow-sm">
                  <Printer size={16} /> Offerte Printen
                </button>
                <button onClick={handleDownloadOfferteHTML} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded hover:bg-green-700 transition-colors shadow-sm">
                  <FileText size={16} /> Offerte Downloaden
                </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-5 lg:col-span-4 space-y-6">
            {!isMaatValid && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
                <div className="flex items-center gap-2 text-red-700 font-bold mb-1"><AlertTriangle size={20} /><span>Maatvoering klopt niet!</span></div>
                <div className="text-sm text-red-600">
                  <p>Opgegeven totaal: <strong>{maten.totaalBreedte}mm</strong></p>
                  <p>Berekend: <strong>{berekendeTotaalBreedte}mm</strong></p>
                  <p className="mt-1 font-semibold">Verschil: {berekendeTotaalBreedte - maten.totaalBreedte}mm</p>
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold mb-4 border-b pb-2">Hoofdmaten (mm)</h2>
              <div className="grid grid-cols-2 gap-4">
                {['totaalBreedte', 'totaalHoogte', 'zijpaneelBreedte', 'bovenpaneelHoogte', 'overhangLinks', 'overhangRechts'].map(key => (
                  <div key={key}>
                    <label className="text-xs font-bold text-gray-500 uppercase">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                    <input type="number" value={maten[key]} onChange={(e) => handleMaatChange(key, e.target.value)} 
                           className={`w-full p-2 border rounded mt-1 focus:ring-2 focus:ring-blue-500 outline-none ${key === 'totaalBreedte' && !isMaatValid ? 'border-red-300 bg-red-50' : 'border-gray-300'}`} />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h2 className="text-lg font-semibold">Indeling</h2>
                <button onClick={addSectie} className="flex items-center gap-1 text-sm bg-green-100 text-green-800 px-3 py-1 rounded hover:bg-green-200 transition-colors"><Plus size={16} /> Toevoegen</button>
              </div>
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {secties.map((sectie, idx) => (
                  <div key={idx} className="bg-gray-50 p-4 rounded border border-gray-200 relative group hover:shadow-md transition-shadow">
                    <div className="absolute top-2 right-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => removeSectie(idx)} className="text-gray-400 hover:text-red-600 p-1" title="Verwijder sectie"><Trash2 size={18} /></button>
                    </div>
                    <span className="text-xs font-bold text-gray-400 mb-2 block">SECTIE {idx + 1}</span>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Type</label>
                        <select value={sectie.type} onChange={(e) => handleSectieChange(idx, 'type', e.target.value)} className="w-full p-2 text-sm border rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                          <option value="draai">Draairaam</option>
                          <option value="kiep">Kiep</option>
                          <option value="kiepdraai">Kiep-Draai</option>
                          <option value="vast">Vast glas</option>
                          <option value="dicht">Paneel</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Breedte (mm)</label>
                        <input type="number" value={sectie.breedte} onChange={(e) => handleSectieChange(idx, 'breedte', parseFloat(e.target.value))} className="w-full p-2 text-sm border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                    </div>
                    {(sectie.type === 'draai' || sectie.type === 'kiepdraai') && (
                        <div className="mb-3">
                             <label className="block text-xs text-gray-500 mb-1">Draairichting</label>
                             <select value={sectie.draairichting} onChange={(e) => handleSectieChange(idx, 'draairichting', e.target.value)} className="w-full p-2 text-sm border rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                <option value="links">Links draaiend (Scharnier L)</option>
                                <option value="rechts">Rechts draaiend (Scharnier R)</option>
                             </select>
                        </div>
                    )}
                    {sectie.type !== 'dicht' && (
                        <div className="flex gap-4 border-t pt-3 mt-2">
                        {['rooster', 'rolluik', 'hor'].map(opt => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={sectie[opt]} onChange={(e) => handleSectieChange(idx, opt, e.target.checked)} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                            <span className="text-xs font-medium capitalize text-gray-600">{opt}</span>
                            </label>
                        ))}
                        </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="col-span-7 lg:col-span-8">
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
    </div>
  );
}