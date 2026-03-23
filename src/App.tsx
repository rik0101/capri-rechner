import { useState, useRef, useEffect } from 'react';
import { Calculator, Info, Star } from 'lucide-react';

interface CalculationResult {
  afaAlt: number;
  afaNeu: number;
  zinskosten: number;
  gesamtAbsetzbarAlt: number;
  gesamtAbsetzbarNeu: number;
  steuerAlt: number;
  steuerNeu: number;
  yearlySavings: number;
  cumulativeSavings: number[];
}

function App() {
  const [kaufpreisAlt, setKaufpreisAlt] = useState(300000);
  const [marktwert, setMarktwert] = useState(500000);
  const [spekulationAbgelaufen, setSpekulationAbgelaufen] = useState(true);
  const [showExpert, setShowExpert] = useState(false);
  const [gebaudeanteil, setGebaudeanteil] = useState(80);
  const [nutzungsdauer, setNutzungsdauer] = useState(50);
  const [zinssatz, setZinssatz] = useState(2.5);
  const [steuersatz, setSteuersatz] = useState(42);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [email, setEmail] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailError, setEmailError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const formatEUR = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const calculate = (e: React.FormEvent) => {
    e.preventDefault();

    const afaAlt = (kaufpreisAlt * (gebaudeanteil / 100)) / 50;
    const afaNeu = (marktwert * (gebaudeanteil / 100)) / nutzungsdauer;
    const zinskosten = marktwert * (zinssatz / 100);
    const gesamtAbsetzbarAlt = afaAlt;
    const gesamtAbsetzbarNeu = afaNeu + zinskosten;
    const steuerAlt = gesamtAbsetzbarAlt * (steuersatz / 100);
    const steuerNeu = gesamtAbsetzbarNeu * (steuersatz / 100);
    const yearlySavings = steuerNeu - steuerAlt;

    const cumulativeSavings = [];
    for (let year = 1; year <= 10; year++) {
      cumulativeSavings.push(yearlySavings * year);
    }

    setResult({
      afaAlt,
      afaNeu,
      zinskosten,
      gesamtAbsetzbarAlt,
      gesamtAbsetzbarNeu,
      steuerAlt,
      steuerNeu,
      yearlySavings,
      cumulativeSavings
    });
    setShowEmailForm(true);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-lead`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            calculation_details: result ? {
              kaufpreisAlt,
              marktwert,
              yearlySavings: result.yearlySavings,
              afaAlt: result.afaAlt,
              afaNeu: result.afaNeu,
              zinskosten: result.zinskosten,
              gesamtAbsetzbarAlt: result.gesamtAbsetzbarAlt,
              gesamtAbsetzbarNeu: result.gesamtAbsetzbarNeu,
              steuerAlt: result.steuerAlt,
              steuerNeu: result.steuerNeu,
              cumulativeSavings: result.cumulativeSavings,
            } : undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Absenden');
      }

      setEmailSubmitted(true);
      setEmail('');
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten');
    }
  };

  useEffect(() => {
    if (result && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';

      const padding = 40;
      const labelOffset = 30;
      const chartWidth = rect.width - 2 * padding;
      const chartHeight = rect.height - 2 * padding;
      const maxValue = Math.max(...result.cumulativeSavings);
      const stepX = chartWidth / 9;
      const scaleY = chartHeight / maxValue;

      ctx.clearRect(0, 0, rect.width, rect.height);

      ctx.strokeStyle = '#e0e6ed';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(rect.width - padding, y);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(28, 30, 101, 0.1)';
      ctx.beginPath();
      ctx.moveTo(padding, rect.height - padding);
      result.cumulativeSavings.forEach((value, i) => {
        const x = padding + stepX * i;
        const y = rect.height - padding - value * scaleY;
        if (i === 0) {
          ctx.lineTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.lineTo(rect.width - padding, rect.height - padding);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#1c1e65';
      ctx.lineWidth = 3;
      ctx.beginPath();
      result.cumulativeSavings.forEach((value, i) => {
        const x = padding + stepX * i;
        const y = rect.height - padding - value * scaleY;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      ctx.fillStyle = '#1c1e65';
      result.cumulativeSavings.forEach((value, i) => {
        const x = padding + stepX * i;
        const y = rect.height - padding - value * scaleY;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = '#343a40';
      ctx.font = '12px effra, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Jahr', padding - labelOffset, rect.height - padding + 20);

      ctx.textAlign = 'center';
      result.cumulativeSavings.forEach((_, i) => {
        const x = padding + stepX * i;
        ctx.fillText(`${i + 1}`, x, rect.height - padding + 20);
      });
    }
  }, [result]);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#1c1e65] text-white py-12 px-8 text-center">
          <div className="text-sm mb-4 opacity-75">Ein Service von CAPRI CONSULT</div>
          <h1 className="text-4xl font-bold mb-3 flex items-center justify-center gap-3">
            <Calculator size={40} />
            Ehegattenschaukel-Rechner
          </h1>
          <p className="text-xl opacity-95">
            Berechne deine potenzielle Steuerersparnis durch innerehelichen Immobilienverkauf
          </p>
        </div>

        <div className="p-8">
          {!spekulationAbgelaufen && (
            <div className="bg-red-50 border-l-4 border-red-600 p-5 mb-8">
              <strong className="block text-red-600 font-bold mb-2 text-base">
                ⚠️ Achtung: Verkauf wäre steuerpflichtig!
              </strong>
              <p className="text-red-600 text-base">
                Das Modell lohnt sich meist nur nach Ablauf der 10-jährigen Spekulationsfrist.
              </p>
            </div>
          )}

          <form onSubmit={calculate}>
            <div className="mb-8">
              <h2 className="text-3xl text-[#1c1e65] font-bold mb-6">Basis-Angaben</h2>

              <div className="mb-6">
                <label className="flex items-center mb-2 text-base text-gray-700">
                  Ursprünglicher Kaufpreis
                  <Tooltip text="Der Preis, zu dem die Immobilie ursprünglich erworben wurde (inkl. Kaufnebenkosten)." />
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={kaufpreisAlt}
                    onChange={(e) => setKaufpreisAlt(Number(e.target.value))}
                    className="w-full px-5 py-4 pr-14 border border-gray-500 text-base focus:outline-none focus:border-[#1c1e65] focus:shadow-[0_0_0_0.25rem_rgba(28,30,101,0.25)] transition-all"
                    step="1000"
                    required
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 text-base pointer-events-none">€</span>
                </div>
              </div>

              <div className="mb-6">
                <label className="flex items-center mb-2 text-base text-gray-700">
                  Aktueller Marktwert
                  <Tooltip text="Der aktuelle Verkehrswert der Immobilie (Verkaufspreis an Ehepartner)." />
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={marktwert}
                    onChange={(e) => setMarktwert(Number(e.target.value))}
                    className="w-full px-5 py-4 pr-14 border border-gray-500 text-base focus:outline-none focus:border-[#1c1e65] focus:shadow-[0_0_0_0.25rem_rgba(28,30,101,0.25)] transition-all"
                    step="1000"
                    required
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 text-base pointer-events-none">€</span>
                </div>
              </div>

              <div className="mb-6">
                <label className="flex items-center mb-2 text-base text-gray-700">
                  Spekulationsfrist abgelaufen? (10 Jahre)
                  <TooltipMobile text="Nach 10 Jahren Haltedauer ist der Verkauf steuerfrei. Vorher würde der Gewinn versteuert werden." />
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setSpekulationAbgelaufen(!spekulationAbgelaufen)}
                    className={`relative flex-shrink-0 w-16 h-8 rounded-full transition-all duration-300 ${
                      spekulationAbgelaufen ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  >
                    <span
                      className={`absolute w-7 h-7 bg-white rounded-full top-0.5 transition-all duration-300 ${
                        spekulationAbgelaufen ? 'left-0.5' : 'left-8'
                      }`}
                    />
                  </button>
                  <span className="text-base text-gray-700 select-none">{spekulationAbgelaufen ? 'Ja' : 'Nein'}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowExpert(!showExpert)}
              className="w-full bg-gray-100 border border-gray-500 px-12 py-4 flex items-center justify-between hover:bg-gray-200 transition-colors mb-8"
            >
              <span className="text-[#1c1e65]">⚙️ Experten-Einstellungen</span>
              <span className="transition-transform" style={{ transform: showExpert ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
            </button>

            <div
              className="transition-all"
              style={{
                maxHeight: showExpert ? '600px' : '0',
                overflow: showExpert ? 'visible' : 'hidden'
              }}
            >
              <div className="mb-8">
                <div className="mb-6">
                  <label className="flex items-center mb-2 text-base text-gray-700">
                    Gebäudeanteil
                    <TooltipMobile text="Kaufpreisaufteilung gemäß Arbeitshilfe des BMF oder Gutachten." />
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={gebaudeanteil}
                      onChange={(e) => setGebaudeanteil(Number(e.target.value))}
                      className="w-full px-5 py-4 pr-14 border border-gray-500 text-base focus:outline-none focus:border-[#1c1e65] focus:shadow-[0_0_0_0.25rem_rgba(28,30,101,0.25)] transition-all"
                      min="0"
                      max="100"
                      step="1"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 text-base pointer-events-none">%</span>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="flex items-center mb-2 text-base text-gray-700">
                    Restnutzungsdauer (neue AfA-Basis)
                    <TooltipMobile text="Die verbleibende Nutzungsdauer nach Verkauf (oft durch Gutachten ermittelt). Standard: 50 Jahre = 2% AfA." />
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={nutzungsdauer}
                      onChange={(e) => setNutzungsdauer(Number(e.target.value))}
                      className="w-full px-5 py-4 pr-20 border border-gray-500 text-base focus:outline-none focus:border-[#1c1e65] focus:shadow-[0_0_0_0.25rem_rgba(28,30,101,0.25)] transition-all"
                      min="1"
                      max="100"
                      step="1"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 text-base pointer-events-none">Jahre</span>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="flex items-center mb-2 text-base text-gray-700">
                    Zinssatz für Ehegatten-Darlehen
                    <TooltipMobile text="Zinssatz für das Darlehen zwischen Ehepartnern. Zinsaufwendungen sind steuerlich absetzbar." />
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={zinssatz}
                      onChange={(e) => setZinssatz(Number(e.target.value))}
                      className="w-full px-5 py-4 pr-14 border border-gray-500 text-base focus:outline-none focus:border-[#1c1e65] focus:shadow-[0_0_0_0.25rem_rgba(28,30,101,0.25)] transition-all"
                      min="0"
                      max="10"
                      step="0.1"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 text-base pointer-events-none">%</span>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="flex items-center mb-2 text-base text-gray-700">
                    Steuersatz
                    <Tooltip text="Ihr persönlicher Grenzsteuersatz (inkl. Solidaritätszuschlag). Spitzensteuersatz: 42%." />
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={steuersatz}
                      onChange={(e) => setSteuersatz(Number(e.target.value))}
                      className="w-full px-5 py-4 pr-14 border border-gray-500 text-base focus:outline-none focus:border-[#1c1e65] focus:shadow-[0_0_0_0.25rem_rgba(28,30,101,0.25)] transition-all"
                      min="0"
                      max="50"
                      step="1"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 text-base pointer-events-none">%</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full px-12 py-4 bg-[#1c1e65] text-white text-xl hover:bg-[#14153f] focus:outline-none focus:shadow-[0_0_0_0.25rem_rgba(28,30,101,0.25)] active:bg-[#0e0f2b] transition-all mt-8"
            >
              Jetzt berechnen
            </button>
          </form>

          {result && (
            <div className="mt-12 pt-12 border-t-2 border-gray-200">
              {showEmailForm && !emailSubmitted && (
                <div className="bg-gradient-to-br from-[#1c1e65] to-[#2a2d8f] text-white p-8 mb-8 shadow-lg">
                  <h3 className="text-2xl font-bold mb-4">
                    Alle Ergebnisse per E-Mail erhalten
                  </h3>
                  <p className="mb-6 text-lg opacity-95">
                    Erhalte eine detaillierte Analyse und erfahre in einem kostenfreien Beratungsgespräch, wie du diese und weitere Steuertricks umsetzen kannst.
                  </p>

                  <div className="flex items-center gap-2 mb-6 text-xs sm:text-sm">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} fill="#fbbf24" stroke="#fbbf24" className="sm:w-[18px] sm:h-[18px]" />
                      ))}
                    </div>
                    <span className="font-semibold whitespace-nowrap">4,95 von 5</span>
                    <span className="opacity-75 whitespace-nowrap">(359 Bewertungen)</span>
                  </div>

                  <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Deine E-Mail-Adresse"
                      className="flex-1 px-5 py-3 text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-white"
                      required
                    />
                    <button
                      type="submit"
                      className="px-8 py-3 bg-[#94fab7] text-[#1c1e65] font-bold text-base hover:bg-[#7ee8a3] transition-colors whitespace-nowrap"
                    >
                      Jetzt Analyse anfordern
                    </button>
                  </form>
                  {emailError && (
                    <p className="mt-3 text-red-300 text-sm">{emailError}</p>
                  )}
                </div>
              )}

              {emailSubmitted && (
                <div className="bg-green-50 border-l-4 border-green-600 p-6 mb-8">
                  <h3 className="text-green-800 font-bold text-xl mb-2">
                    Vielen Dank!
                  </h3>
                  <p className="text-green-700 mb-4">
                    Wir haben dir eine E-Mail mit deiner Berechnung gesendet. Möchtest du unverbindlich von einem CAPRI CONSULT Experten beraten werden?
                  </p>
                  <a
                    href="https://www.capri-consult.de/kontakt/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-6 py-3 bg-[#94fab7] text-[#1c1e65] font-bold hover:bg-[#7ee8a3] transition-colors"
                  >
                    Direkt Termin vereinbaren
                  </a>
                </div>
              )}

              <div className="text-center py-10 px-8 bg-[#94fab7] text-[#1c1e65] mb-8">
                <p className="text-xl mb-3">Deine jährliche Steuerersparnis</p>
                <h3 className="text-5xl font-bold mb-1">{formatEUR(result.yearlySavings)}</h3>
                <small className="text-base">pro Jahr</small>
              </div>

              <div className="bg-gray-100 border border-gray-500 mb-8">
                <div className="grid grid-cols-3 bg-[#1c1e65] text-white p-4 font-bold">
                  <div></div>
                  <div className="text-center">Vorher</div>
                  <div className="text-center">Nachher</div>
                </div>
                <div className="grid grid-cols-3 p-4 border-b border-gray-200">
                  <div className="text-gray-700">AfA (Abschreibung)</div>
                  <div className="text-center font-bold text-red-600">{formatEUR(result.afaAlt)}</div>
                  <div className="text-center font-bold text-green-600">{formatEUR(result.afaNeu)}</div>
                </div>
                <div className="grid grid-cols-3 p-4 border-b border-gray-200">
                  <div className="text-gray-700">Zinsaufwendungen</div>
                  <div className="text-center font-bold text-red-600">0 €</div>
                  <div className="text-center font-bold text-green-600">{formatEUR(result.zinskosten)}</div>
                </div>
                <div className="grid grid-cols-3 p-4 border-b border-gray-200">
                  <div className="text-gray-700">Gesamt absetzbar</div>
                  <div className="text-center font-bold text-red-600">{formatEUR(result.gesamtAbsetzbarAlt)}</div>
                  <div className="text-center font-bold text-green-600">{formatEUR(result.gesamtAbsetzbarNeu)}</div>
                </div>
                <div className="grid grid-cols-3 p-4">
                  <div className="text-gray-700">Steuerersparnis (jährlich)</div>
                  <div className="text-center font-bold text-red-600">{formatEUR(result.steuerAlt)}</div>
                  <div className="text-center font-bold text-green-600">{formatEUR(result.steuerNeu)}</div>
                </div>
              </div>

              <div className="bg-gray-100 border border-gray-500 p-8 mt-8">
                <h3 className="text-3xl text-[#1c1e65] font-bold mb-6">
                  📊 10-Jahres-Vorschau: Kumulierte Steuerersparnis
                </h3>
                <canvas ref={canvasRef} className="w-full h-64 mb-6" />
                <div className="text-center py-6 px-8 bg-[#1c1e65] text-white">
                  <p className="text-xl mb-2">Gesamtersparnis nach 10 Jahren</p>
                  <h4 className="text-4xl font-bold">{formatEUR(result.cumulativeSavings[9])}</h4>
                </div>
              </div>

              <div className="bg-[#1c1e65] text-white p-8 mt-8 text-center">
                <h3 className="text-2xl font-bold mb-3">
                  Möchtest du diese Steuerersparnis nutzen?
                </h3>
                <p className="text-lg mb-6 opacity-95">
                  Unsere Experten von CAPRI CONSULT unterstützen dich bei der rechtssicheren Umsetzung.
                </p>
                <a
                  href="https://www.capri-consult.de/kontakt/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-8 py-4 bg-[#94fab7] text-[#1c1e65] font-bold text-lg hover:bg-[#7ee8a3] transition-colors"
                >
                  Jetzt kostenlose Erstberatung vereinbaren
                </a>
                <div className="flex items-center justify-center gap-2 mt-6 text-xs sm:text-sm">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} fill="#fbbf24" stroke="#fbbf24" className="sm:w-4 sm:h-4" />
                    ))}
                  </div>
                  <span className="font-semibold whitespace-nowrap">4,95 von 5</span>
                  <span className="opacity-75 whitespace-nowrap">(359 Bewertungen)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Tooltip({ text }: { text: string }) {
  const [position, setPosition] = useState<'center' | 'right'>('center');
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkPosition = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const tooltipWidth = 256;
        const leftEdge = rect.left + rect.width / 2 - tooltipWidth / 2;

        if (leftEdge < 16) {
          setPosition('right');
        } else {
          setPosition('center');
        }
      }
    };

    checkPosition();
    window.addEventListener('resize', checkPosition);
    return () => window.removeEventListener('resize', checkPosition);
  }, []);

  return (
    <div ref={containerRef} className="relative group ml-2">
      <Info size={18} className="text-[#1c1e65] cursor-help" />
      <div
        ref={tooltipRef}
        className={`absolute bottom-full mb-2 hidden group-hover:block w-64 max-w-[calc(100vw-2rem)] bg-[#1c1e65] text-white p-3 text-sm leading-relaxed shadow-[0_0_0_0.25rem_rgba(28,30,101,0.25)] z-10 ${
          position === 'right' ? 'left-0' : 'left-1/2 -translate-x-1/2'
        }`}
      >
        {text}
      </div>
    </div>
  );
}

function TooltipMobile({ text }: { text: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className="relative ml-2 inline-block"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <Info
        size={18}
        className="text-[#1c1e65] cursor-help"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      />
      {isOpen && (
        <div
          ref={tooltipRef}
          className="absolute bottom-full right-0 mb-2 w-64 max-w-[calc(100vw-2rem)] bg-[#1c1e65] text-white p-3 text-sm leading-relaxed shadow-lg z-50"
        >
          {text}
          <div className="absolute right-4 -bottom-2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-[#1c1e65]"></div>
        </div>
      )}
    </div>
  );
}

export default App;
