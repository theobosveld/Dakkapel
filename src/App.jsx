// App.jsx — Floorplan (uitgebreid) + Frontview (alle functionaliteiten) + Borstwering-toggle
import React, { useState, useMemo, useRef } from 'react';
import { Plus, Trash2, Layers, Printer, ImageIcon, Upload } from 'lucide-react';

/* ----- Paletten & vaste opties ----- */
const MATERIAAL_OPTIES = {
  kunststof: { label: 'Kunststof (Wit)', color: '#ffffff', sideColor: '#e2e8f0', stroke: '#94a3b8' },
  houtlook:  { label: 'Houtlook (Eiken)', color: '#78350f', sideColor: '#451a03', stroke: '#451a03' },
  keralit:   { label: 'Keralit (Antraciet)', color: '#334155', sideColor: '#1e293b', stroke: '#0f172a' }
};

const RAAM_TYPES = {
  vast:       { label: 'Vast',          icon: '🪟' },
  draaikiepL: { label: 'Draaikiep L',   icon: '⤶' },
  draaikiepR: { label: 'Draaikiep R',   icon: '⤷' },
  draaiL:     { label: 'Draairaam L',   icon: '←' },
  draaiR:     { label: 'Draairaam R',   icon: '→' },
  val:        { label: 'Valraam',       icon: '↓' }
};

const RAL_KLEUREN = {
  RAL9016: { label: 'Wit RAL 9016', hex: '#F2F2F2' },
  RAL9010: { label: 'Wit RAL 9010', hex: '#F6F6F2' },
  RAL9001: { label: 'Crème RAL 9001', hex: '#F4E4C1' },
  RAL7016: { label: 'Antracietgrijs RAL 7016', hex: '#383E42' },
  RAL7021: { label: 'Zwartgrijs RAL 7021', hex: '#2F3438' },
  RAL6009: { label: 'Dennengroen RAL 6009', hex: '#27352A' },
  RAL7039: { label: 'Kwartsgrijs RAL 7039', hex: '#6B6A6A' },
  RAL9005: { label: 'Zwart RAL 9005', hex: '#0A0A0A' },
  RAL7012: { label: 'Basaltgrijs RAL 7012', hex: '#4C5057' }
};

const GLAS_TYPES = {
  hrpp:   { label: 'HR++', fill: '#e6f4ff', stroke: '#99c7ff', opacity: 0.9 },
  triple: { label: 'Triple +++', fill: '#d0ebff', stroke: '#7fb9ff', opacity: 0.95 },
  melk:   { label: 'Melkglas', fill: '#e5e7eb', stroke: '#cbd5e1', opacity: 0.95 }
};

const HWA_OPTIES = ['geen','links','rechts','beide','voorkant'];

/* ----- Helpers ----- */
const parsePositions = (str) =>
    (str || '')
        .split(/[,\s;]+/)
        .map(s => s.trim().replace('%', ''))
        .map(Number)
        .filter(n => Number.isFinite(n));

/* ======================================================
   APP
====================================================== */
const App = () => {
  const [stap, setStap] = useState(1);

  /* ---- Globale configuratie ---- */
  const [config, setConfig] = useState({
    basisBreedte: 6000,
    muurAfstandL: 400,
    muurAfstandR: 500,
    wandDikte: 185,
    blindPlaat: 210,
    overstekZijkant: 230,
    overstekVoor: 0,
    boeiHoogte: 220,
    kozijnHoogte: 1500,
    // ⬇︎ Nieuw: borstwering kan uit (of hoogte aanpassen)
    showBorstwering: true,
    borstweringH: 300,

    materiaal: 'kunststof',
    kozijnProfiel: 70,

    // Frontview weergave/patronen/glas/kleuren
    borstweringOri: 'blanco',
    wangOri: 'blanco',
    hwa: 'geen',
    glasType: 'hrpp',
    kleurBuiten: 'RAL7016',
    kleurBinnen: 'RAL9016',
    kleurSash: 'RAL7016',

    // Overlay-modus
    modus: 'tekenen',
    overlayOpacity: 40,
    overlayScale: 1.0,
    overlayOffsetX: 0,
    overlayOffsetY: 0
  });

  const [binnenMuren, setBinnenMuren] = useState([{ pos: 3124, dikte: 110 }]);

  // Per-vak instellingen + per-pane types (frontview)
  const [sectieOpties, setSectieOpties] = useState({});

  // Overlay image (frontview)
  const [overlayUrl, setOverlayUrl] = useState(null);
  const fileRef = useRef(null);

  /* ---- Afgeleiden ---- */
  const breedteTussenWangen = config.basisBreedte - config.muurAfstandL - config.muurAfstandR;
  const gesorteerdeMuren = useMemo(() => [...binnenMuren].sort((a, b) => a.pos - b.pos), [binnenMuren]);

  const ruimtes = useMemo(() => {
    const r = [];
    let lastPos = 0;
    gesorteerdeMuren.forEach(muur => {
      r.push(muur.pos - lastPos);
      lastPos = muur.pos + muur.dikte;
    });
    r.push(breedteTussenWangen - lastPos);
    return r;
  }, [gesorteerdeMuren, breedteTussenWangen]);

  // Schaal
  const scale = 900 / Math.max(1, config.basisBreedte);

  // Frontview: wangenposities (zoals in snippet)
  const xWangL = 42 + (config.muurAfstandL * scale);
  const xWangR = 42 + (config.basisBreedte - config.muurAfstandR) * scale;

  // Kleuren
  const frameColor = (RAL_KLEUREN[config.kleurBuiten]?.hex) || MATERIAAL_OPTIES[config.materiaal].color;
  const frameStroke = "#1e293b";
  const sashColor   = (RAL_KLEUREN[config.kleurSash]?.hex) || '#94a3b8';

  /* ---- Updaters (frontview) ---- */
  const updateSectie = (idx, key, val) => {
    setSectieOpties(prev => {
      const defaults = {
        type: 'vast',
        staanders: 0,
        regels: 0,
        verdeling: 'auto',   // 'auto' | 'handmatig'
        posUnits: 'mm',      // 'mm' | '%'
        staanderPosStr: '',
        regelPosStr: '',
        paneTypes: {},       // 'r,c' -> type
        selectedPane: { row: 0, col: 0 },
        hor: false,
        rooster: false,
        rolluik: false,
        zonnescherm: false
      };
      const current = prev[idx] ? { ...defaults, ...prev[idx] } : defaults;
      return { ...prev, [idx]: { ...current, [key]: val } };
    });
  };

  const setPaneType = (vakIdx, row, col, paneType) => {
    setSectieOpties(prev => {
      const defaults = {
        type: 'vast',
        staanders: 0,
        regels: 0,
        verdeling: 'auto',
        posUnits: 'mm',
        staanderPosStr: '',
        regelPosStr: '',
        paneTypes: {},
        selectedPane: { row: 0, col: 0 },
        hor: false, rooster: false, rolluik: false, zonnescherm: false
      };
      const cur = prev[vakIdx] ? { ...defaults, ...prev[vakIdx] } : defaults;
      const key = `${row},${col}`;
      const newPaneTypes = { ...(cur.paneTypes || {}), [key]: paneType };
      return { ...prev, [vakIdx]: { ...cur, paneTypes: newPaneTypes } };
    });
  };

  const getPaneType = (vakIdx, r, c, fallback) =>
      sectieOpties[vakIdx]?.paneTypes?.[`${r},${c}`] || fallback || 'vast';

  const handlePrint = () => window.print();

  const onOverlayFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setOverlayUrl(reader.result);
    reader.readAsDataURL(f);
  };

  /* ---- Maatlijnen ---- */
  const DimensionLine = ({ x1, x2, y, label, subLabel, yellowBox = false, small = false }) => {
    const midX = (x1 + x2) / 2;
    if (Math.abs(x2 - x1) < 1) return null;
    return (
        <g>
          <line x1={x1} y1={y} x2={x2} y2={y} stroke="black" strokeWidth="1.2" />
          <line x1={x1} y1={y - 8} x2={x1} y2={y + 8} stroke="black" strokeWidth="1" />
          <line x1={x2} y1={y - 8} x2={x2} y2={y + 8} stroke="black" strokeWidth="1" />
          <rect
              x={midX - (small ? 20 : 30)}
              y={y - 12}
              width={small ? 40 : 60}
              height={24}
              fill={yellowBox ? "#fef08a" : "white"}
              stroke={yellowBox ? "#854d0e" : "#cbd5e1"}
              rx="2"
          />
          <text x={midX} y={y + 5} textAnchor="middle" fontSize={small ? "9" : "11"} fontWeight="bold">{label}</text>
          {subLabel && (
              <text x={midX} y={y - 18} textAnchor="middle" fontSize="8" fontWeight="bold" fill="#64748b">{subLabel}</text>
          )}
        </g>
    );
  };

  // Floorplan-variant met pijlen
  const DimensionLineTop = ({ x1, x2, y, label, subLabel, yellowBox = false, showArrows = true }) => {
    const midX = (x1 + x2) / 2;
    if (isNaN(x1) || isNaN(x2)) return null;
    return (
        <g>
          <line x1={x1} y1={y} x2={x2} y2={y} stroke="black" strokeWidth="1.5" />
          {showArrows && (
              <>
                <path d={`M ${x1} ${y} L ${x1 + 10} ${y - 4} L ${x1 + 10} ${y + 4} Z`} fill="black" />
                <path d={`M ${x2} ${y} L ${x2 - 10} ${y - 4} L ${x2 - 10} ${y + 4} Z`} fill="black" />
              </>
          )}
          <line x1={x1} y1={y - 15} x2={x1} y2={y + 15} stroke="black" strokeWidth="1" />
          <line x1={x2} y1={y - 15} x2={x2} y2={y + 15} stroke="black" strokeWidth="1" />
          <rect
              x={midX - 35}
              y={y - 12}
              width="70"
              height="24"
              fill={yellowBox ? '#fef08a' : 'white'}
              stroke={yellowBox ? '#854d0e' : '#f59e0b'}
              rx="2"
          />
          <text x={midX} y={y + 5} textAnchor="middle" fontSize="13" fontWeight="bold" fill="black">
            {label}
          </text>
          {subLabel && (
              <text x={midX} y={y - 20} textAnchor="middle" fontSize="11" fontWeight="bold" fill="black">
                {subLabel}
              </text>
          )}
        </g>
    );
  };

  /* ---- Hulppatroon-lijntjes ---- */
  const PatternLines = ({ x, y, w, h, orientation = 'blanco', stroke = '#cbd5e1' }) => {
    if (orientation === 'blanco') return null;
    const step = 10;
    const lines = [];
    if (orientation === 'horizontaal') {
      for (let yy = y + 3; yy < y + h; yy += step) {
        lines.push(<line key={yy} x1={x+2} y1={yy} x2={x+w-2} y2={yy} stroke={stroke} strokeWidth="1" />);
      }
    } else if (orientation === 'verticaal') {
      for (let xx = x + 3; xx < x + w; xx += step) {
        lines.push(<line key={xx} x1={xx} y1={y+2} x2={xx} y2={y+h-2} stroke={stroke} strokeWidth="1" />);
      }
    }
    return <g>{lines}</g>;
  };

  /* ======================================================
     UI
  ====================================================== */
  return (
      <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900">
        <header className="bg-white border-b px-8 py-4 flex justify-between items-center shadow-sm z-20 no-print">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-black italic text-blue-600 uppercase tracking-tighter">Dakkapel Architect</h1>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setStap(1)} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${stap === 1 ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>1. Floorplan</button>
              <button onClick={() => setStap(2)} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${stap === 2 ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>2. Vooraanzicht</button>
            </div>
          </div>
          <button onClick={handlePrint} className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm hover:bg-slate-700 transition-colors">
            <Printer size={18} /> Print Werking
          </button>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* -------------------- ZIJBALK LINKS -------------------- */}
          <aside className="w-85 bg-white border-r overflow-y-auto p-6 flex flex-col gap-6 shadow-xl no-print">
            {stap === 1 ? (
                /* -------------------- STAP 1: FLOORPLAN -------------------- */
                <div className="space-y-6">
                  <InputGroup label="Totale Breedte" value={config.basisBreedte} onChange={v => setConfig({ ...config, basisBreedte: parseInt(v || 0) })} />
                  <div className="grid grid-cols-2 gap-3">
                    <InputGroup label="Muurafstand L" value={config.muurAfstandL} onChange={v => setConfig({ ...config, muurAfstandL: parseInt(v || 0) })} />
                    <InputGroup label="Muurafstand R" value={config.muurAfstandR} onChange={v => setConfig({ ...config, muurAfstandR: parseInt(v || 0) })} />
                  </div>
                  <InputGroup label="Dikte wangen (wanddikte)" value={config.wandDikte} onChange={v => setConfig({ ...config, wandDikte: parseInt(v || 0) })} />
                  <InputGroup label="Blindplaat" value={config.blindPlaat} onChange={v => setConfig({ ...config, blindPlaat: parseInt(v || 0) })} />
                  <InputGroup label="Overstek zijkant" value={config.overstekZijkant} onChange={v => setConfig({ ...config, overstekZijkant: parseInt(v || 0) })} />

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Binnenmuren</h3>
                      <button onClick={() => setBinnenMuren([...binnenMuren, { pos: Math.round((breedteTussenWangen) / 2), dikte: 110 }])} className="p-1 bg-blue-600 text-white rounded">
                        <Plus size={14} />
                      </button>
                    </div>
                    {binnenMuren.map((m, i) => (
                        <div key={i} className="mb-3 p-3 bg-slate-50 rounded-lg border relative">
                          <button onClick={() => setBinnenMuren(binnenMuren.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 text-red-400">
                            <Trash2 size={12} />
                          </button>
                          <div className="grid grid-cols-2 gap-3">
                            <InputGroup label="Positie" value={m.pos} onChange={v => {
                              const newM = [...binnenMuren]; newM[i].pos = parseInt(v || 0); setBinnenMuren(newM);
                            }} />
                            <InputGroup label="Dikte" value={m.dikte} onChange={v => {
                              const newM = [...binnenMuren]; newM[i].dikte = parseInt(v || 0); setBinnenMuren(newM);
                            }} />
                          </div>
                        </div>
                    ))}
                  </div>
                </div>
            ) : (
                /* -------------------- STAP 2: VOORAANZICHT -------------------- */
                <div className="space-y-6">
                  {/* Materiaal + kozijnprofiel + kleuren + glas */}
                  <section className="space-y-3">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Layers size={14} /> Materiaal & Weergave
                    </h3>

                    {/* Modus: Tekenen vs Afbeelding-overlay */}
                    <div className="grid grid-cols-2 gap-2">
                      {['tekenen','afbeelding'].map(mode => (
                          <button key={mode}
                                  onClick={() => setConfig({ ...config, modus: mode })}
                                  className={`p-2 rounded-lg border text-[10px] font-black uppercase ${
                                      config.modus === mode ? 'bg-slate-800 text-white' : 'bg-white text-slate-300'
                                  }`}>
                            {mode === 'tekenen' ? 'Teken dakkapel' : 'Achtergrondafbeelding'}
                          </button>
                      ))}
                    </div>

                    {config.modus === 'afbeelding' && (
                        <div className="flex flex-col gap-2 p-3 border rounded-xl">
                          <div className="flex items-center gap-2">
                            <input type="file" accept="image/*" ref={fileRef} onChange={onOverlayFile} className="hidden" />
                            <button onClick={() => fileRef.current?.click()} className="px-3 py-2 rounded bg-slate-800 text-white text-xs font-bold flex items-center gap-2">
                              <Upload size={14} /> Upload afbeelding
                            </button>
                            {overlayUrl ? <span className="text-xs text-slate-500">Afbeelding geladen</span> : <span className="text-xs text-slate-400">Geen afbeelding</span>}
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <InputGroup label="Opacity (%)" value={config.overlayOpacity} onChange={v => setConfig({ ...config, overlayOpacity: Math.max(0, Math.min(100, parseInt(v || 0))) })} />
                            <InputGroup label="Schaal (×)" value={config.overlayScale} onChange={v => setConfig({ ...config, overlayScale: Math.max(0.1, parseFloat(v || 0)) })} type="number" />
                            <InputGroup label="Offset X" value={config.overlayOffsetX} onChange={v => setConfig({ ...config, overlayOffsetX: parseInt(v || 0) })} />
                            <InputGroup label="Offset Y" value={config.overlayOffsetY} onChange={v => setConfig({ ...config, overlayOffsetY: parseInt(v || 0) })} />
                          </div>
                          <p className="text-[10px] text-slate-400">Tip: pas schaal/offset aan zodat de tekening over de foto uitlijnt.</p>
                        </div>
                    )}

                    {/* Materiaal & kozijnprofiel */}
                    <div className="grid grid-cols-1 gap-2">
                      {Object.entries(MATERIAAL_OPTIES).map(([k, v]) => (
                          <button key={k} onClick={() => setConfig({ ...config, materiaal: k })}
                                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                                      config.materiaal === k ? 'border-blue-600 bg-blue-50' : 'border-slate-100'
                                  }`}>
                            <div className="w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: v.color }} />
                            <span className="text-xs font-bold uppercase tracking-tight">{v.label}</span>
                          </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <InputGroup label="Kozijnprofiel (mm)" value={config.kozijnProfiel} onChange={v => setConfig({ ...config, kozijnProfiel: Math.max(30, parseInt(v || 0)) })} />
                      <InputGroup label="Boei hoogte (mm)" value={config.boeiHoogte} onChange={v => setConfig({ ...config, boeiHoogte: Math.max(100, parseInt(v || 0)) })} />
                    </div>

                    {/* Overstek: Zijkant en Voorzijde */}
                    <div className="grid grid-cols-2 gap-3">
                      <InputGroup label="Overstek zijkant (mm)" value={config.overstekZijkant} onChange={v => setConfig({ ...config, overstekZijkant: Math.max(0, parseInt(v || 0)) })} />
                      <InputGroup label="Overstek voorzijde (mm)" value={config.overstekVoor} onChange={v => setConfig({ ...config, overstekVoor: Math.max(0, parseInt(v || 0)) })} />
                    </div>

                    {/* Glas & Kleur */}
                    <div className="grid grid-cols-3 gap-3">
                      <SelectGroup label="Glas" value={config.glasType} onChange={v => setConfig({ ...config, glasType: v })} options={GLAS_TYPES} />
                      <SelectGroup label="Kleur buitenzijde" value={config.kleurBuiten} onChange={v => setConfig({ ...config, kleurBuiten: v })} options={RAL_KLEUREN} />
                      <SelectGroup label="Kleur draaikiepramen" value={config.kleurSash} onChange={v => setConfig({ ...config, kleurSash: v })} options={RAL_KLEUREN} />
                    </div>

                    {/* Patronen en HWA */}
                    <div className="grid grid-cols-3 gap-3">
                      <SelectEnum label="Borstwering patroon" value={config.borstweringOri} onChange={v => setConfig({ ...config, borstweringOri: v })} items={['blanco','horizontaal','verticaal']} />
                      <SelectEnum label="Zijwangen patroon"   value={config.wangOri}       onChange={v => setConfig({ ...config, wangOri: v })} items={['blanco','horizontaal','verticaal']} />
                      <SelectEnum label="Hemelwaterafvoer"    value={config.hwa}           onChange={v => setConfig({ ...config, hwa: v })} items={HWA_OPTIES} />
                    </div>
                  </section>

                  {/* ⬇︎ NIEUWE SECTIE: Borstwering aan/uit + hoogte */}
                  <section className="space-y-3 border rounded-xl p-3">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Borstwering</h3>
                    <div className="flex items-center gap-3">
                      <button
                          onClick={() => setConfig({ ...config, showBorstwering: !config.showBorstwering })}
                          className={`px-3 py-1 rounded border text-[10px] font-black uppercase ${
                              config.showBorstwering ? 'bg-slate-800 text-white' : 'bg-white text-slate-500'
                          }`}
                      >
                        {config.showBorstwering ? 'Tonen' : 'Verbergen'}
                      </button>
                      <InputGroup
                          label="Hoogte (mm)"
                          value={config.borstweringH}
                          onChange={v => setConfig({ ...config, borstweringH: Math.max(0, parseInt(v || 0)) })}
                          disabled={!config.showBorstwering}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Als de borstwering is verborgen, loopt het glasvlak door tot aan de onderzijde van het kozijn.
                    </p>
                  </section>

                  {/* Per vak configuratie */}
                  {ruimtes.map((ruimte, i) => {
                    const opt = sectieOpties[i] || {
                      type: 'vast',
                      staanders: 0, regels: 0,
                      verdeling: 'auto', posUnits: 'mm', staanderPosStr: '', regelPosStr: '',
                      paneTypes: {}, selectedPane: { row: 0, col: 0 },
                      hor: false, rooster: false, rolluik: false, zonnescherm: false
                    };
                    const isManual = opt.verdeling === 'handmatig';

                    const countCols = isManual ? (parsePositions(opt.staanderPosStr).length + 1) : (Math.max(0, opt.staanders) + 1);
                    const countRows = isManual ? (parsePositions(opt.regelPosStr).length + 1) : (Math.max(0, opt.regels) + 1);

                    return (
                        <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                          <span className="text-[10px] font-black text-blue-600 uppercase">Vak {i + 1}</span>

                          {/* Default type */}
                          <div className="grid grid-cols-3 gap-1">
                            {Object.entries(RAAM_TYPES).map(([k, v]) => (
                                <button key={k} onClick={() => updateSectie(i, 'type', k)}
                                        className={`p-2 rounded-lg border text-[8px] font-bold flex flex-col items-center ${
                                            (opt.type || 'vast') === k ? 'border-blue-600 bg-white' : 'border-transparent text-slate-400'
                                        }`}>
                                  <span className="text-sm">{v.icon}</span>{v.label}
                                </button>
                            ))}
                          </div>

                          {/* Extra opties per vak */}
                          <div className="flex gap-2">
                            {['rolluik', 'hor', 'rooster', 'zonnescherm'].map(name => (
                                <button key={name} onClick={() => updateSectie(i, name, !opt?.[name])}
                                        className={`flex-1 p-2 rounded-lg border text-[8px] font-black uppercase transition-all ${
                                            opt?.[name] ? 'bg-slate-800 text-white' : 'bg-white text-slate-300'
                                        }`}>
                                  {name}
                                </button>
                            ))}
                          </div>

                          {/* Aantallen staanders/regels */}
                          <div className="grid grid-cols-2 gap-3">
                            <InputGroup label="Staanders (verticaal)" value={opt?.staanders ?? 0}
                                        onChange={v => updateSectie(i, 'staanders', Math.max(0, Math.min(12, parseInt(v || 0))))} disabled={isManual} />
                            <InputGroup label="Regels (horizontaal)" value={opt?.regels ?? 0}
                                        onChange={v => updateSectie(i, 'regels', Math.max(0, Math.min(12, parseInt(v || 0))))} disabled={isManual} />
                          </div>

                          {/* Quick roedeverdeling & frames */}
                          <div className="grid grid-cols-3 gap-3">
                            <QuickHV title="Roedeverdeling H" range={[0,1,2,3]} current={isManual ? parsePositions(opt.staanderPosStr).length : opt.staanders}
                                     onSelect={(h) => updateSectie(i, 'staanders', h)} disabled={isManual} />
                            <QuickHV title="Roedeverdeling V" range={[0,1,2,3]} current={isManual ? parsePositions(opt.regelPosStr).length : opt.regels}
                                     onSelect={(v) => updateSectie(i, 'regels', v)} disabled={isManual} />
                            <QuickHV title="Frames" range={[1,2,3,4,5]} current={isManual ? (parsePositions(opt.staanderPosStr).length + 1) : (opt.staanders + 1)}
                                     onSelect={(f) => updateSectie(i, 'staanders', Math.max(0, f - 1))} disabled={isManual} />
                          </div>

                          {/* Verdeling: Auto / Handmatig */}
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => updateSectie(i, 'verdeling', 'auto')}
                                    className={`p-2 rounded-lg border text-[10px] font-black uppercase ${
                                        (opt?.verdeling || 'auto') !== 'handmatig' ? 'bg-slate-800 text-white' : 'bg-white text-slate-300'
                                    }`}>Automatisch</button>
                            <button onClick={() => updateSectie(i, 'verdeling', 'handmatig')}
                                    className={`p-2 rounded-lg border text-[10px] font-black uppercase ${
                                        opt?.verdeling === 'handmatig' ? 'bg-slate-800 text-white' : 'bg-white text-slate-300'
                                    }`}>Handmatig</button>
                          </div>

                          {/* Handmatige posities */}
                          {isManual && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase ml-1">Eenheid</span>
                                  <div className="flex gap-1">
                                    {['mm','%'].map(u => (
                                        <button key={u} onClick={() => updateSectie(i, 'posUnits', u)}
                                                className={`px-3 py-1 rounded border text-[10px] font-black uppercase ${
                                                    (opt?.posUnits ?? 'mm') === u ? 'bg-slate-800 text-white' : 'bg-white text-slate-300'
                                                }`}>{u}</button>
                                    ))}
                                  </div>
                                </div>
                                <InputGroup type="text" label={`Staanders (${opt?.posUnits || 'mm'})`}
                                            placeholder={(opt?.posUnits || 'mm') === '%' ? 'bijv. 25, 50, 75' : 'bijv. 400, 900, 1200'}
                                            value={opt?.staanderPosStr ?? ''} onChange={v => updateSectie(i, 'staanderPosStr', v)} />
                                <InputGroup type="text" label={`Regels (${opt?.posUnits || 'mm'})`}
                                            placeholder={(opt?.posUnits || 'mm') === '%' ? 'bijv. 33, 66' : 'bijv. 300, 700'}
                                            value={opt?.regelPosStr ?? ''} onChange={v => updateSectie(i, 'regelPosStr', v)} />
                                <p className="text-[10px] text-slate-400">Posities zijn t.o.v. het <i>glasvlak</i>; 0% links/boven en 100% rechts/onder.</p>
                              </div>
                          )}

                          {/* Paneel-selector + per-pane type keuze */}
                          <div className="space-y-2">
                            <div className="text-[10px] font-bold text-slate-500 uppercase ml-1">Selecteer ruit</div>
                            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(1, countCols)}, minmax(0, 1fr))` }}>
                              {Array.from({ length: Math.max(1, countRows) }).map((_, r) =>
                                  Array.from({ length: Math.max(1, countCols) }).map((_, c) => {
                                    const sel = opt.selectedPane || { row: 0, col: 0 };
                                    const active = sel.row === r && sel.col === c;
                                    const paneType = getPaneType(i, r, c, opt.type);
                                    return (
                                        <button key={`sel-${r}-${c}`} onClick={() => updateSectie(i, 'selectedPane', { row: r, col: c })}
                                                className={`p-2 text-[10px] rounded border font-bold ${
                                                    active ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-500 border-slate-200'
                                                }`} title={`Ruit ${r+1}×${c+1}`}>
                                          {RAAM_TYPES[paneType]?.icon || '•'}
                                        </button>
                                    );
                                  })
                              )}
                            </div>

                            <div className="text-[10px] font-bold text-slate-500 uppercase ml-1">Raamtype geselecteerde ruit</div>
                            <div className="grid grid-cols-3 gap-1">
                              {Object.entries(RAAM_TYPES).map(([k, v]) => (
                                  <button key={`paneType-${k}`} onClick={() => {
                                    const sel = opt.selectedPane || { row: 0, col: 0 };
                                    setPaneType(i, sel.row, sel.col, k);
                                  }} className={`p-2 rounded-lg border text-[8px] font-bold flex flex-col items-center ${
                                      (getPaneType(i, (opt.selectedPane||{}).row||0, (opt.selectedPane||{}).col||0, opt.type)) === k
                                          ? 'border-blue-600 bg-white' : 'border-transparent text-slate-400'
                                  }`}>
                                    <span className="text-sm">{v.icon}</span>{v.label}
                                  </button>
                              ))}
                            </div>
                          </div>
                        </div>
                    );
                  })}
                </div>
            )}
          </aside>

          {/* -------------------- CANVAS -------------------- */}
          <main className="flex-1 p-8 flex items-center justify-center overflow-auto print:p-0">
            <div className="w-full max-w-6xl bg-white rounded-[3rem] shadow-2xl border border-slate-200 p-16 aspect-[1.6/1] relative print:shadow-none print:border-none print:rounded-none">
              <svg viewBox="0 0 1000 550" className="w-full h-full">
                {/* Overlay (alleen in frontview) */}
                {stap === 2 && config.modus === 'afbeelding' && overlayUrl && (
                    <image
                        href={overlayUrl}
                        x={config.overlayOffsetX}
                        y={config.overlayOffsetY}
                        width={1000 * config.overlayScale}
                        height={550 * config.overlayScale}
                        opacity={config.overlayOpacity / 100}
                        preserveAspectRatio="xMinYMin meet"
                    />
                )}

                {/* Titel */}
                <text x="500" y="40" textAnchor="middle" fontSize="24" fontWeight="bold" className={stap === 2 ? "hidden print:block" : ""}>
                  {stap === 1 ? 'FLOORPLAN' : 'WERKTEKENING DAKKAPEL'}
                </text>

                {stap === 1 ? (
                    /* ---------- FLOORPLAN ---------- */
                    <>
                      {/* Fundament palen */}
                      <rect x="10"  y="380" width="12" height="170" fill="#cbd5e1" />
                      <rect x="30"  y="380" width="12" height="170" fill="#cbd5e1" />
                      <rect x="958" y="380" width="12" height="170" fill="#cbd5e1" />
                      <rect x="978" y="380" width="12" height="170" fill="#cbd5e1" />

                      {/* Bovenste lijn */}
                      <line x1="10" y1="40" x2="990" y2="40" stroke="black" strokeWidth="2.5" />
                      <text x="10" y="30" fontSize="20" fontWeight="900">Bovenaanzicht</text>

                      {(() => {
                        const offsetY = 300;
                        const xWangL_FP = 42 + (config.muurAfstandL * scale);
                        const xWangR_FP = 958 - (config.muurAfstandR * scale);

                        return (
                            <>
                              <rect x={xWangL_FP} y={offsetY - 100} width={18} height={180} fill="#64748b" />
                              <text x={xWangL_FP + 9} y={offsetY + 110} textAnchor="middle" fontSize="12" fontWeight="bold">{config.wandDikte}</text>
                              <text x={xWangL_FP + 9} y={offsetY + 125} textAnchor="middle" fontSize="10" fill="#64748b">wanddikte</text>

                              <rect x={xWangR_FP - 18} y={offsetY - 100} width={18} height={180} fill="#64748b" />
                              <text x={xWangR_FP - 9} y={offsetY + 110} textAnchor="middle" fontSize="12" fontWeight="bold">{config.wandDikte}</text>
                              <text x={xWangR_FP - 9} y={offsetY + 125} textAnchor="middle" fontSize="10" fill="#64748b">wanddikte</text>

                              <DimensionLineTop x1={42}        x2={xWangL_FP} y={offsetY + 80} label={config.muurAfstandL} subLabel="muurafstand" yellowBox />
                              <DimensionLineTop x1={xWangR_FP} x2={958}       y={offsetY + 80} label={config.muurAfstandR} subLabel="muurafstand" yellowBox />

                              <DimensionLineTop x1={xWangL_FP} x2={xWangR_FP} y={offsetY + 20} label={breedteTussenWangen} subLabel="breedte tussen de wangen" />

                              {ruimtes.map((ruimte, i) => {
                                let currentStartX = xWangL_FP;
                                for (let j = 0; j < i; j++) {
                                  currentStartX += (ruimtes[j] * scale) + (gesorteerdeMuren[j].dikte * scale);
                                }
                                const sectieStart = currentStartX;
                                const sectieEnd   = currentStartX + (ruimte * scale);
                                const midSectie   = sectieStart + (ruimte * scale) / 2;

                                return (
                                    <g key={i}>
                                      <DimensionLineTop
                                          x1={sectieStart}
                                          x2={sectieEnd}
                                          y={offsetY + 180}
                                          label={Math.round(ruimte)}
                                          subLabel={`ruimte ${i + 1}`}
                                          yellowBox
                                      />

                                      <g transform={`translate(${midSectie}, ${offsetY - 80})`}>
                                        <text x="0" y="-35" textAnchor="middle" fontSize="11" fontWeight="bold">Kozijnmaat</text>
                                        <rect x="-30" y="-30" width="60" height="36" fill="white" stroke="#f59e0b" rx="2" />
                                        <text x="0" y="-18" textAnchor="middle" fontSize="12" fontWeight="bold">
                                          {Math.round(ruimte - config.blindPlaat)}
                                        </text>
                                        <line x1="-25" y1="-10" x2="25" y2="-10" stroke="#f59e0b" strokeWidth="1" />
                                        <text x="0" y="3" textAnchor="middle" fontSize="12" fontWeight="bold">
                                          {Math.round(ruimte - config.blindPlaat + 78)}
                                        </text>
                                      </g>

                                      {i < gesorteerdeMuren.length && (() => {
                                        const mDikte = gesorteerdeMuren[i].dikte;
                                        const muurPosInSvg = sectieEnd;
                                        const muurMidX     = muurPosInSvg + (mDikte * scale) / 2;
                                        return (
                                            <g>
                                              <rect x={muurPosInSvg} y={offsetY + 50} width={mDikte * scale} height={200} fill="#94a3b8" />
                                              <rect x={muurMidX - 25} y={offsetY - 20} width="50" height="25" fill="#fef08a" stroke="#854d0e" rx="2" />
                                              <text x={muurMidX} y={offsetY - 30} textAnchor="middle" fontSize="11" fontWeight="bold">Muurdikte</text>
                                              <text x={muurMidX} y={offsetY - 3}  textAnchor="middle" fontSize="12" fontWeight="bold">{mDikte}</text>

                                              <g transform={`translate(${muurMidX}, ${offsetY - 110})`}>
                                                <text x="0" y="-35" textAnchor="middle" fontSize="11" fontWeight="bold">Blindp.</text>
                                                <rect x="-25" y="-30" width="50" height="20" fill="white" stroke="#f59e0b" rx="2" />
                                                <text x="0" y="-16" textAnchor="middle" fontSize="12" fontWeight="bold">{config.blindPlaat}</text>
                                                <rect x="-45" y="-5" width="30" height="18" fill="#fef08a" stroke="#854d0e" rx="1" />
                                                <text x="-30" y="8" textAnchor="middle" fontSize="11" fontWeight="bold">50</text>
                                                <rect x="-15" y="-5" width="30" height="18" fill="white" stroke="#854d0e" rx="1" />
                                                <text x="0" y="8" textAnchor="middle" fontSize="11" fontWeight="bold">{mDikte}</text>
                                                <rect x="15" y="-5" width="30" height="18" fill="#fef08a" stroke="#854d0e" rx="1" />
                                                <text x="30" y="8" textAnchor="middle" fontSize="11" fontWeight="bold">50</text>
                                              </g>
                                            </g>
                                        );
                                      })()}
                                    </g>
                                );
                              })}

                              <g transform={`translate(${xWangR_FP + 20}, 60)`}>
                                <text x="0" y="15" textAnchor="middle" fontSize="11" fontWeight="bold">overstek zijkant</text>
                                <DimensionLineTop x1={-30} x2={30} y={35} label={config.overstekZijkant} yellowBox />
                              </g>
                            </>
                        );
                      })()}
                    </>
                ) : (
                    /* ---------- VOORAANZICHT ---------- */
                    <>
                      {/* Boei */}
                      <rect
                          x={xWangL - (config.overstekZijkant * scale)}
                          y={100 - (config.overstekVoor * scale)}
                          width={(breedteTussenWangen * scale) + (config.overstekZijkant * 2 * scale)}
                          height={config.boeiHoogte * scale + (config.overstekVoor * scale)}
                          fill={MATERIAAL_OPTIES[config.materiaal].color}
                          stroke="#1e293b"
                          strokeWidth="2"
                      />

                      <DimensionLine x1={xWangL - (config.overstekZijkant * scale)} x2={xWangL} y={80} label={config.overstekZijkant} yellowBox small />

                      {/* Wangen */}
                      <g>
                        <rect
                            x={xWangL - (config.wandDikte * scale)}
                            y={100 + (config.boeiHoogte * scale)}
                            width={config.wandDikte * scale}
                            height={config.kozijnHoogte * scale}
                            fill={MATERIAAL_OPTIES[config.materiaal].sideColor}
                            stroke="#1e293b"
                        />
                        <PatternLines
                            x={xWangL - (config.wandDikte * scale)} y={100 + (config.boeiHoogte * scale)}
                            w={config.wandDikte * scale} h={config.kozijnHoogte * scale}
                            orientation={config.wangOri} stroke="#94a3b8"
                        />
                      </g>
                      <g>
                        <rect
                            x={xWangR}
                            y={100 + (config.boeiHoogte * scale)}
                            width={config.wandDikte * scale}
                            height={config.kozijnHoogte * scale}
                            fill={MATERIAAL_OPTIES[config.materiaal].sideColor}
                            stroke="#1e293b"
                        />
                        <PatternLines
                            x={xWangR} y={100 + (config.boeiHoogte * scale)}
                            w={config.wandDikte * scale} h={config.kozijnHoogte * scale}
                            orientation={config.wangOri} stroke="#94a3b8"
                        />
                      </g>

                      {/* HWA */}
                      {['links','beide'].includes(config.hwa) && (
                          <g>
                            <rect x={xWangL - (config.wandDikte * scale) - 8} y={100} width={6} height={config.boeiHoogte * scale + config.kozijnHoogte * scale + 40} fill="#6b7280" rx="2" />
                            <rect x={xWangL - (config.wandDikte * scale) - 8} y={100 + (config.boeiHoogte * scale) - 8} width={16} height={6} fill="#6b7280" rx="2" />
                          </g>
                      )}
                      {['rechts','beide'].includes(config.hwa) && (
                          <g>
                            <rect x={xWangR + (config.wandDikte * scale) + 2} y={100} width={6} height={config.boeiHoogte * scale + config.kozijnHoogte * scale + 40} fill="#6b7280" rx="2" />
                            <rect x={xWangR + (config.wandDikte * scale) - 12} y={100 + (config.boeiHoogte * scale) - 8} width={16} height={6} fill="#6b7280" rx="2" />
                          </g>
                      )}
                      {config.hwa === 'voorkant' && (
                          <g>
                            <rect x={(xWangL + xWangR)/2 - 3} y={100 + (config.boeiHoogte * scale)} width={6} height={config.kozijnHoogte * scale + 40} fill="#6b7280" rx="2" />
                          </g>
                      )}

                      {/* Vakken */}
                      {ruimtes.map((ruimte, i) => {
                        let curX = xWangL;
                        for (let j = 0; j < i; j++) curX += (ruimtes[j] + gesorteerdeMuren[j].dikte) * scale;

                        const w  = ruimte * scale;
                        const startY = 100 + (config.boeiHoogte * scale);
                        const p = Math.max(4, (config.kozijnProfiel || 70) * scale);

                        // ⬇︎ ruit-hoogte afhankelijk van showBorstwering
                        const rH = (config.kozijnHoogte - (config.showBorstwering ? config.borstweringH : 0)) * scale;

                        const opt = {
                          type: 'vast', staanders: 0, regels: 0,
                          verdeling: 'auto', posUnits: 'mm', staanderPosStr: '', regelPosStr: '',
                          paneTypes: {}, selectedPane: { row: 0, col: 0 },
                          hor: false, rooster: false, rolluik: false, zonnescherm: false,
                          ...(sectieOpties[i] || {})
                        };

                        const gx = curX + p;
                        const gy = startY + p;
                        const gw = Math.max(0, w - 2 * p);
                        const gh = Math.max(0, rH - 2 * p);

                        const glas = GLAS_TYPES[config.glasType] || GLAS_TYPES.hrpp;

                        const isManual = opt.verdeling === 'handmatig';
                        const units    = opt.posUnits || 'mm';

                        let vPositionsPx = [];
                        if (gw > 0 && gh > 0) {
                          if (isManual) {
                            const vals = parsePositions(opt.staanderPosStr);
                            vPositionsPx = vals.map(v => units === '%' ? (v / 100) * gw : v * scale);
                          } else {
                            const count = Math.max(0, opt.staanders || 0);
                            const step  = count > 0 ? gw / (count + 1) : 0;
                            vPositionsPx = Array.from({ length: count }, (_, k) => step * (k + 1));
                          }
                          vPositionsPx = vPositionsPx.map(px => Math.max(p / 2, Math.min(gw - p / 2, px))).sort((a, b) => a - b);
                        }

                        let hPositionsPx = [];
                        if (gw > 0 && gh > 0) {
                          if (isManual) {
                            const vals = parsePositions(opt.regelPosStr);
                            hPositionsPx = vals.map(v => units === '%' ? (v / 100) * gh : v * scale);
                          } else {
                            const count = Math.max(0, opt.regels || 0);
                            const step  = count > 0 ? gh / (count + 1) : 0;
                            hPositionsPx = Array.from({ length: count }, (_, k) => step * (k + 1));
                          }
                          hPositionsPx = hPositionsPx.map(px => Math.max(p / 2, Math.min(gh - p / 2, px))).sort((a, b) => a - b);
                        }

                        const colEdges = [0, ...vPositionsPx, gw];
                        const rowEdges = [0, ...hPositionsPx, gh];

                        return (
                            <g key={i}>
                              {/* Kozijn kader */}
                              <rect x={curX} y={startY} width={p} height={rH} fill={frameColor} stroke={frameStroke} strokeWidth="1.5" />
                              <rect x={curX + w - p} y={startY} width={p} height={rH} fill={frameColor} stroke={frameStroke} strokeWidth="1.5" />
                              <rect x={curX} y={startY} width={w} height={p} fill={frameColor} stroke={frameStroke} strokeWidth="1.5" />
                              <rect x={curX} y={startY + rH - p} width={w} height={p} fill={frameColor} stroke={frameStroke} strokeWidth="1.5" />

                              {/* Glasvlak */}
                              {gw > 0 && gh > 0 && (
                                  <rect x={gx} y={gy} width={gw} height={gh}
                                        fill={glas.fill} opacity={glas.opacity}
                                        stroke={glas.stroke} strokeWidth="1.2" />
                              )}

                              {/* Staanders */}
                              {gw > 0 && gh > 0 && vPositionsPx.map((pos, k) => (
                                  <rect key={`s-${k}`} x={gx + pos - (p / 2)} y={gy} width={p} height={gh} fill={frameColor} stroke={frameStroke} strokeWidth="1" />
                              ))}

                              {/* Regels */}
                              {gw > 0 && gh > 0 && hPositionsPx.map((pos, k) => (
                                  <rect key={`r-${k}`} x={gx} y={gy + pos - (p / 2)} width={gw} height={p} fill={frameColor} stroke={frameStroke} strokeWidth="1" />
                              ))}

                              {/* Paneel-specifieke lijnen */}
                              {gw > 0 && gh > 0 && rowEdges.slice(0, -1).map((ry, rIdx) =>
                                  colEdges.slice(0, -1).map((cx, cIdx) => {
                                    const px = gx + cx;
                                    const py = gy + ry;
                                    const pw = (colEdges[cIdx + 1] - cx);
                                    const ph = (rowEdges[rIdx + 1] - ry);
                                    const t  = getPaneType(i, rIdx, cIdx, opt.type);

                                    return (
                                        <g key={`pane-${rIdx}-${cIdx}`}>
                                          {(t === 'draaikiepR' || t === 'draaiR') && (
                                              <path d={`M ${px},${py} L ${px+pw},${py+ph/2} L ${px},${py+ph}`}
                                                    fill="none" stroke={sashColor} strokeWidth="1"
                                                    strokeDasharray={String(t).includes('kiep') ? "5 5" : ""} />
                                          )}
                                          {(t === 'draaikiepL' || t === 'draaiL') && (
                                              <path d={`M ${px+pw},${py} L ${px},${py+ph/2} L ${px+pw},${py+ph}`}
                                                    fill="none" stroke={sashColor} strokeWidth="1"
                                                    strokeDasharray={String(t).includes('kiep') ? "5 5" : ""} />
                                          )}
                                          {t === 'val' && (
                                              <path d={`M ${px},${py} L ${px+pw/2},${py+ph} L ${px+pw},${py}`}
                                                    fill="none" stroke={sashColor} strokeWidth="1" strokeDasharray="5 5" />
                                          )}
                                        </g>
                                    );
                                  })
                              )}

                              {/* Accessoires */}
                              {opt.rooster && (<rect x={curX + 10} y={startY + 10} width={w - 20} height={12} fill="#94a3b8" rx="2" />)}
                              {opt.rolluik && (<rect x={curX - 2} y={startY - 15} width={w + 4} height={25} fill="#334155" rx="3" />)}
                              {opt.zonnescherm && (
                                  <g>
                                    <rect x={curX} y={startY - 10} width={w} height={8} fill="#475569" />
                                    {Array.from({length: Math.max(4, Math.floor(w/10))}).map((_, k) => (
                                        <line key={k} x1={curX + k*10} y1={startY - 10} x2={curX + k*10} y2={startY - 2} stroke="#e2e8f0" strokeWidth="2" />
                                    ))}
                                  </g>
                              )}

                              {/* Borstwering (alleen als showBorstwering) */}
                              {config.showBorstwering && (
                                  <g>
                                    <rect x={curX} y={startY + rH} width={w} height={config.borstweringH * scale} fill={frameColor} stroke="#1e293b" strokeWidth="2" />
                                    <PatternLines
                                        x={curX} y={startY + rH}
                                        w={w} h={config.borstweringH * scale}
                                        orientation={config.borstweringOri} stroke="#cbd5e1"
                                    />
                                  </g>
                              )}

                              {/* Maatvoering per vak (blijft hetzelfde) */}
                              <DimensionLine x1={curX} x2={curX + w} y={startY + (config.kozijnHoogte * scale) + 40} label={Math.round(ruimte)} yellowBox />

                              {/* Tussenstijlen */}
                              {i < gesorteerdeMuren.length && (
                                  <g>
                                    <rect x={curX + w} y={startY} width={gesorteerdeMuren[i].dikte * scale} height={config.kozijnHoogte * scale} fill="#94a3b8" stroke="#1e293b" />
                                    <DimensionLine x1={curX + w} x2={curX + w + (gesorteerdeMuren[i].dikte * scale)} y={startY - 20} label={gesorteerdeMuren[i].dikte} small />
                                  </g>
                              )}

                              {/* Info kozijn-/glasmaat (tekst) */}
                              {gw > 0 && gh > 0 && (
                                  <g>
                                    <text x={curX + w/2} y={startY + rH + (config.showBorstwering ? (config.borstweringH * scale) : 0) + 16} textAnchor="middle" fontSize="9" fill="#475569" fontWeight="600">
                                      Kozijn: {Math.round(ruimte)} × {Math.round(config.kozijnHoogte - (config.showBorstwering ? config.borstweringH : 0))} mm
                                    </text>
                                    <text x={curX + w/2} y={startY + rH + (config.showBorstwering ? (config.borstweringH * scale) : 0) + 28} textAnchor="middle" fontSize="9" fill="#64748b">
                                      Binnenmaat glas: {Math.round(gw/scale)} × {Math.round(gh/scale)} mm
                                    </text>
                                  </g>
                              )}
                            </g>
                        );
                      })}

                      {/* Totale kozijnbreedte */}
                      <DimensionLine x1={xWangL} x2={xWangR} y={480} label={config.basisBreedte - config.muurAfstandL - config.muurAfstandR} subLabel="Totale Kozijnbreedte" />
                    </>
                )}
              </svg>
            </div>
          </main>
        </div>

        {/* PRINT CSS */}
        <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .h-screen { height: auto; overflow: visible; }
          svg { width: 100%; height: auto; }
        }
      `}</style>
      </div>
  );
};

/* ----- Kleine UI helpers ----- */
const InputGroup = ({ label, value, onChange, type = "number", placeholder = "", disabled = false }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter ml-1">{label}</label>
      <input
          type={type}
          value={value}
          onChange={(e) => onChange(type === 'number' ? e.target.value : e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
    </div>
);

const SelectGroup = ({ label, value, onChange, options }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-titter ml-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold">
        {Object.entries(options).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
        ))}
      </select>
    </div>
);

const SelectEnum = ({ label, value, onChange, items }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-titter ml-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold">
        {items.map(it => <option key={it} value={it}>{it}</option>)}
      </select>
    </div>
);


const QuickHV = ({ title, range, current, onSelect, disabled }) => (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold text-slate-500 uppercase ml-1">{title}</span>
      <div className="flex gap-1">
        {range.map(v => (
            <button key={v} onClick={() => !disabled && onSelect(v)}
                    className={`px-2 py-1 rounded border text-[10px] font-black ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${
                        current === v ? 'bg-slate-800 text-white' : 'bg-white text-slate-500'
                    }`}>{v}</button>
        ))}
      </div>
    </div>
);

export default App;