import React, { useMemo, useState } from "react";
import {
  Plane,
  Package,
  MapPin,
  ChevronDown,
  Info,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// DATA — transcribed literally from "Freight Calculation Extranet June 2026.xlsx"
// ---------------------------------------------------------------------------

type Row = {
  country: string;
  airport: string;
  rate: number; // €/kg
  min: number; // Air Freight Min (flat charge in € / departure currency)
  inspection: "Required" | "Not Required";
  estimated?: boolean; // true = not in the original source file, interpolated from comparable routes
};

const DEPARTURES: Record<string, Row[]> = {
  Hungary: [
    { country: "Kenya", airport: "Nairobi", rate: 6.5, min: 200, inspection: "Required" },
    { country: "Tanzanie", airport: "Dar es Salaam", rate: 7, min: 250, inspection: "Required" },
    { country: "Ouganda", airport: "Entebbe", rate: 7, min: 250, inspection: "Required" },
    { country: "Burkina Faso", airport: "Ouagadougou", rate: 12, min: 250, inspection: "Required" },
    { country: "Congo", airport: "Kinshasa", rate: 12, min: 250, inspection: "Not Required" },
    { country: "Djibouti", airport: "Djibouti-Ambouli", rate: 18, min: 250, inspection: "Required" },
    { country: "Ghana", airport: "Accra", rate: 6.5, min: 250, inspection: "Required" },
    { country: "Nigeria", airport: "Lagos", rate: 7, min: 250, inspection: "Required" },
    { country: "Sénégal", airport: "Dakar", rate: 8.5, min: 250, inspection: "Required" },
    { country: "Côte d'Ivoire", airport: "Abidjan", rate: 8, min: 250, inspection: "Required", estimated: true },
    { country: "Éthiopie", airport: "Addis Ababa", rate: 7.5, min: 250, inspection: "Required" },
    { country: "Tchad", airport: "Exeter", rate: 9.5, min: 250, inspection: "Required" },
    { country: "Cameroun", airport: "Douala", rate: 9.5, min: 250, inspection: "Required" },
    { country: "Afrique du Sud", airport: "Johannesburg", rate: 7, min: 250, inspection: "Not Required" },
  ],
  Johannesburg: [
    { country: "Kenya", airport: "Nairobi", rate: 9, min: 290, inspection: "Required" },
    { country: "Malawi", airport: "Kamuzu", rate: 6, min: 290, inspection: "Not Required" },
    { country: "Tanzanie", airport: "Dar es Salaam", rate: 11, min: 290, inspection: "Required" },
    { country: "Ouganda", airport: "Entebbe", rate: 10, min: 290, inspection: "Required" },
    { country: "Zambie", airport: "Lusaka", rate: 13, min: 290, inspection: "Not Required" },
    { country: "Maurice", airport: "Mauritius", rate: 7, min: 290, inspection: "Not Required" },
    { country: "Côte d'Ivoire", airport: "Abidjan", rate: 15, min: 290, inspection: "Required" },
    { country: "Mozambique", airport: "Maputo", rate: 11, min: 290, inspection: "Not Required" },
    { country: "Burkina Faso", airport: "Ouagadougou", rate: 8, min: 290, inspection: "Required" },
    { country: "Congo", airport: "Kinshasa", rate: 6, min: 290, inspection: "Not Required" },
    { country: "Djibouti", airport: "Djibouti-Ambouli", rate: 4, min: 290, inspection: "Required" },
    { country: "Éthiopie", airport: "Addis Ababa", rate: 4.5, min: 290, inspection: "Required" },
    { country: "Ghana", airport: "Accra", rate: 5.5, min: 290, inspection: "Required" },
    { country: "Mali", airport: "Bamako–Sénou", rate: 8.5, min: 290, inspection: "Required" },
    { country: "Nigeria", airport: "Lagos", rate: 6, min: 290, inspection: "Required" },
    { country: "Rwanda", airport: "Kigali", rate: 6, min: 290, inspection: "Required" },
    { country: "Sénégal", airport: "Dakar", rate: 6.5, min: 290, inspection: "Required" },
    { country: "Seychelles", airport: "Seychelles", rate: 4, min: 290, inspection: "Not Required" },
    { country: "Sierra Leone", airport: "Lungi", rate: 8, min: 290, inspection: "Not Required" },
    { country: "Soudan du Sud", airport: "Malakal", rate: 6.5, min: 290, inspection: "Required" },
    { country: "Togo", airport: "Gnassingbé Eyadéma", rate: 6.5, min: 290, inspection: "Required" },
    { country: "Zimbabwe", airport: "Harare", rate: 4, min: 290, inspection: "Not Required" },
    { country: "Gambie", airport: "Banjul", rate: 7.5, min: 290, inspection: "Not Required" },
    { country: "Cameroun", airport: "Douala", rate: 7, min: 290, inspection: "Required" },
    { country: "Tchad", airport: "Exeter", rate: 9, min: 290, inspection: "Required" },
    { country: "Niger", airport: "Diori Hamani", rate: 9, min: 290, inspection: "Required" },
  ],
};

const INCO_TERM = "CPT Port of Discharge";

// Inspection Fees Calculator constants (from sheet, USD & EURO blocks)
const INSPECTION = {
  USD: { min: 265, minEthiopia: 1200, max: 5000, symbol: "$", label: "USD" },
  EUR: { min: 243, minEthiopia: 1000, max: 4500, symbol: "€", label: "EUR" },
} as const;

type Currency = keyof typeof INSPECTION;

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

const fmt = (n: number, digits = 2) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const inspectionLabel = (v: "Required" | "Not Required") =>
  v === "Required" ? "Requise" : "Non requise";

// ---------------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------------

export default function FreightCalculator() {
  const departureNames = Object.keys(DEPARTURES);
  const [departure, setDeparture] = useState<string>(departureNames[0]);
  const rows = DEPARTURES[departure];

  const [country, setCountry] = useState<string>(rows[0].country);
  const [weight, setWeight] = useState<string>("600");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [netValue, setNetValue] = useState<string>("");

  // Keep destination valid when departure changes
  const handleDeparture = (name: string) => {
    setDeparture(name);
    setCountry(DEPARTURES[name][0].country);
  };

  const row = useMemo(
    () => rows.find((r) => r.country === country) ?? rows[0],
    [rows, country]
  );

  const weightNum = Math.max(0, Number(weight) || 0);
  const byWeight = weightNum * row.rate;
  const totalFreight = byWeight < row.min ? row.min : byWeight;
  const minApplied = byWeight < row.min;

  const insp = INSPECTION[currency];
  const minCharge = row.country === "Éthiopie" ? insp.minEthiopia : insp.min;
  const netValueNum = Math.max(0, Number(netValue) || 0);
  const rawFee = netValueNum * 0.01;
  const inspectionFee =
    row.inspection === "Required"
      ? rawFee < minCharge
        ? minCharge
        : rawFee > insp.max
        ? insp.max
        : rawFee
      : null;

  return (
    <div
      style={{
        background: "#F5F2EA",
        minHeight: "100%",
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: "#152634",
      }}
      className="w-full"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap');
        .ff-display { font-family: 'Space Grotesk', sans-serif; }
        .ff-mono { font-family: 'IBM Plex Mono', monospace; }
        .waybill-notch {
          background-image: radial-gradient(circle at 0 50%, #F5F2EA 8px, transparent 8.5px),
                             radial-gradient(circle at 100% 50%, #F5F2EA 8px, transparent 8.5px);
        }
        select { appearance: none; -webkit-appearance: none; }
        input[type=number]::-webkit-inner-spin-button { opacity: 1; }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* ---------------- HEADER ---------------- */}
        <div className="flex items-center gap-3 mb-2">
          <div
            style={{ background: "#152634" }}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          >
            <Plane size={16} color="#E8A33D" strokeWidth={2.25} />
          </div>
          <span
            className="ff-mono text-xs tracking-[0.25em] uppercase"
            style={{ color: "#6E7C87" }}
          >
            Grundfos · Réseau d'export aérien
          </span>
        </div>
        <h1 className="ff-display text-4xl sm:text-5xl font-semibold leading-tight mb-2">
          Calculateur de fret &amp; d'inspection
        </h1>
        <p className="text-base max-w-xl" style={{ color: "#5B6A75" }}>
          Choisissez un dépôt de départ et une destination, saisissez le poids
          brut, et obtenez instantanément une estimation de devis — plus les
          frais d'inspection de la destination.
        </p>

        {/* ---------------- MAIN GRID ---------------- */}
        <div className="grid md:grid-cols-5 gap-6 mt-10">
          {/* ---------- FORM PANEL ---------- */}
          <div
            className="md:col-span-2 rounded-2xl p-6"
            style={{ background: "#FFFFFF", border: "1px solid #E4DFD1" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Package size={16} color="#3D5A73" />
              <h2 className="ff-display text-sm font-semibold uppercase tracking-wide" style={{ color: "#3D5A73" }}>
                Détails de l'expédition
              </h2>
            </div>

            {/* Departure toggle */}
            <label className="block text-xs font-medium mb-2" style={{ color: "#6E7C87" }}>
              Départ
            </label>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {departureNames.map((name) => {
                const active = name === departure;
                return (
                  <button
                    key={name}
                    onClick={() => handleDeparture(name)}
                    className="rounded-lg py-2.5 text-sm font-medium transition-colors"
                    style={{
                      background: active ? "#152634" : "#F5F2EA",
                      color: active ? "#F5F2EA" : "#3D5A73",
                      border: active ? "1px solid #152634" : "1px solid #E4DFD1",
                    }}
                  >
                    {name}
                  </button>
                );
              })}
            </div>

            {/* Destination select */}
            <label className="block text-xs font-medium mb-2" style={{ color: "#6E7C87" }}>
              Pays de destination
            </label>
            <div className="relative mb-5">
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-lg py-2.5 pl-9 pr-9 text-sm font-medium outline-none"
                style={{ background: "#F5F2EA", border: "1px solid #E4DFD1", color: "#152634" }}
              >
                {rows.map((r) => (
                  <option key={r.country} value={r.country}>
                    {r.country} — {r.airport}{r.estimated ? " (estimé)" : ""}
                  </option>
                ))}
              </select>
              <MapPin size={15} color="#6E7C87" style={{ position: "absolute", left: 12, top: 12 }} />
              <ChevronDown size={15} color="#6E7C87" style={{ position: "absolute", right: 12, top: 12 }} />
            </div>
            {row.estimated && (
              <div
                className="flex items-start gap-2 rounded-lg px-3 py-2 -mt-3 mb-5 text-xs"
                style={{ background: "#FBF3E3", border: "1px solid #EFDCA9", color: "#8A6A1F" }}
              >
                <Info size={13} style={{ marginTop: 1, flexShrink: 0 }} />
                <span>
                  Tarif estimé par interpolation à partir de routes ouest-africaines comparables (Sénégal,
                  Ghana) — absent du fichier source d'origine. À confirmer avec le transitaire avant devis.
                </span>
              </div>
            )}

            {/* INCO term (fixed) */}
            <label className="block text-xs font-medium mb-2" style={{ color: "#6E7C87" }}>
              Incoterm
            </label>
            <div
              className="w-full rounded-lg py-2.5 px-3 text-sm mb-5"
              style={{ background: "#F5F2EA", border: "1px solid #E4DFD1", color: "#5B6A75" }}
            >
              {INCO_TERM}
            </div>

            {/* Weight */}
            <label className="block text-xs font-medium mb-2" style={{ color: "#6E7C87" }}>
              Poids brut (kg)
            </label>
            <input
              type="number"
              min={0}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="ex. 600"
              className="w-full rounded-lg py-2.5 px-3 text-sm font-medium outline-none mb-1 ff-mono"
              style={{ background: "#F5F2EA", border: "1px solid #E4DFD1", color: "#152634" }}
            />
            <p className="text-xs" style={{ color: "#8B978F" }}>
              Si le poids brut est inexact en raison de dimensions importantes, le poids volumétrique sera
              utilisé à la place.
            </p>
          </div>

          {/* ---------- WAYBILL RESULT ---------- */}
          <div className="md:col-span-3">
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "#152634", color: "#F5F2EA" }}
            >
              {/* top strip */}
              <div className="flex items-center justify-between px-6 pt-5">
                <span className="ff-mono text-[11px] tracking-[0.2em] uppercase" style={{ color: "#8FA3B0" }}>
                  Estimation de lettre de transport aérien
                </span>
                <span
                  className="ff-mono text-[11px] px-2 py-0.5 rounded-full"
                  style={{ background: "#E8A33D", color: "#152634", fontWeight: 600 }}
                >
                  {departure.toUpperCase()}
                </span>
              </div>

              {/* route line */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 px-5 sm:px-6 pt-6 pb-5">
                <div className="flex-1 flex sm:block items-center justify-between">
                  <div className="ff-display text-lg sm:text-2xl font-semibold break-words">{departure}</div>
                  <div className="ff-mono text-[11px]" style={{ color: "#8FA3B0" }}>ORIGINE</div>
                </div>
                <div className="flex items-center gap-2 sm:px-2 sm:flex-1">
                  <div className="flex-1 h-px sm:hidden" style={{ background: "#3D5A73" }} />
                  <div className="hidden sm:block flex-1 h-px" style={{ background: "#3D5A73" }} />
                  <Plane size={16} color="#E8A33D" className="rotate-90 sm:rotate-0 shrink-0" />
                  <div className="flex-1 h-px" style={{ background: "#3D5A73" }} />
                </div>
                <div className="flex-1 flex sm:block items-center justify-between sm:text-right">
                  <div className="ff-display text-lg sm:text-2xl font-semibold break-words sm:text-right">{row.airport}</div>
                  <div className="ff-mono text-[11px] sm:text-right" style={{ color: "#8FA3B0" }}>{row.country.toUpperCase()}</div>
                </div>
              </div>
              {row.estimated && (
                <div className="px-6 pb-4 -mt-2">
                  <span
                    className="ff-mono text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: "#3D5A73", color: "#F5F2EA" }}
                  >
                    TARIF ESTIMÉ — À CONFIRMER AVANT DEVIS
                  </span>
                </div>
              )}

              {/* perforation */}
              <div className="waybill-notch h-4" style={{ background: "#1F374A" }} />

              {/* breakdown */}
              <div className="px-6 py-6" style={{ background: "#1F374A" }}>
                <div className="grid grid-cols-2 gap-y-3 text-sm mb-5">
                  <span style={{ color: "#8FA3B0" }}>Poids brut</span>
                  <span className="ff-mono text-right">{fmt(weightNum, 0)} kg</span>

                  <span style={{ color: "#8FA3B0" }}>Tarif</span>
                  <span className="ff-mono text-right">€{fmt(row.rate)} / kg</span>

                  <span style={{ color: "#8FA3B0" }}>Minimum de fret</span>
                  <span className="ff-mono text-right">€{fmt(row.min, 0)}</span>

                  <span style={{ color: "#8FA3B0" }}>Poids × Tarif</span>
                  <span className="ff-mono text-right">€{fmt(byWeight)}</span>
                </div>

                <div className="flex items-center justify-between pt-4" style={{ borderTop: "1px solid #33526A" }}>
                  <div>
                    <div className="text-xs uppercase tracking-wide" style={{ color: "#8FA3B0" }}>
                      Total des frais de fret
                    </div>
                    {minApplied && (
                      <div className="text-[11px] mt-0.5" style={{ color: "#E8A33D" }}>
                        Minimum de fret appliqué
                      </div>
                    )}
                  </div>
                  <div className="ff-display text-3xl font-semibold">€{fmt(totalFreight)}</div>
                </div>
              </div>

              {/* inspection badge strip */}
              <div className="px-6 py-4 flex items-center gap-2" style={{ background: "#152634" }}>
                {row.inspection === "Required" ? (
                  <ShieldAlert size={15} color="#E27D5C" />
                ) : (
                  <ShieldCheck size={15} color="#6FB58A" />
                )}
                <span className="text-xs" style={{ color: "#8FA3B0" }}>
                  Frais d'inspection pour {row.country} :
                </span>
                <span
                  className="ff-mono text-xs font-semibold"
                  style={{ color: row.inspection === "Required" ? "#E27D5C" : "#6FB58A" }}
                >
                  {inspectionLabel(row.inspection)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- INSPECTION FEES CALCULATOR ---------------- */}
        <div className="mt-8 rounded-2xl p-6" style={{ background: "#FFFFFF", border: "1px solid #E4DFD1" }}>
          <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
            <div className="flex items-center gap-2">
              <ArrowRight size={16} color="#3D5A73" />
              <h2 className="ff-display text-sm font-semibold uppercase tracking-wide" style={{ color: "#3D5A73" }}>
                Calculateur de frais d'inspection
              </h2>
            </div>
            <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #E4DFD1" }}>
              {(Object.keys(INSPECTION) as Currency[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className="px-4 py-1.5 text-xs font-semibold ff-mono"
                  style={{
                    background: currency === c ? "#152634" : "#F5F2EA",
                    color: currency === c ? "#F5F2EA" : "#5B6A75",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "#6E7C87" }}>
                Valeur nette totale ({currency})
              </label>
              <input
                type="number"
                min={0}
                value={netValue}
                onChange={(e) => setNetValue(e.target.value)}
                placeholder="Valeur du devis hors fret"
                className="w-full rounded-lg py-2.5 px-3 text-sm font-medium outline-none ff-mono"
                style={{ background: "#F5F2EA", border: "1px solid #E4DFD1", color: "#152634" }}
              />
            </div>

            <div>
              <div className="text-xs font-medium mb-2" style={{ color: "#6E7C87" }}>Plage de référence</div>
              <div
                className="rounded-lg py-2.5 px-3 text-sm ff-mono"
                style={{ background: "#F5F2EA", border: "1px solid #E4DFD1", color: "#5B6A75" }}
              >
                {insp.symbol}{fmt(minCharge, 0)} – {insp.symbol}{fmt(insp.max, 0)}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium mb-2" style={{ color: "#6E7C87" }}>Exigence</div>
              <div
                className="rounded-lg py-2.5 px-3 text-sm flex items-center gap-2"
                style={{ background: "#F5F2EA", border: "1px solid #E4DFD1" }}
              >
                {row.inspection === "Required" ? (
                  <ShieldAlert size={14} color="#C4573F" />
                ) : (
                  <ShieldCheck size={14} color="#3F7052" />
                )}
                <span
                  className="text-sm font-medium"
                  style={{ color: row.inspection === "Required" ? "#C4573F" : "#3F7052" }}
                >
                  {inspectionLabel(row.inspection)}
                </span>
              </div>
            </div>
          </div>

          <div
            className="mt-6 rounded-xl p-5 flex items-center justify-between flex-wrap gap-3"
            style={{ background: "#F5F2EA", border: "1px dashed #C9C2AE" }}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} color="#3F7052" />
              <span className="text-sm font-medium" style={{ color: "#152634" }}>
                Frais d'inspection
              </span>
            </div>
            <div className="ff-display text-3xl font-semibold" style={{ color: "#152634" }}>
              {row.inspection === "Required"
                ? `${insp.symbol}${fmt(inspectionFee ?? minCharge, 0)}`
                : "Non requis"}
            </div>
          </div>

          <p className="text-xs mt-4" style={{ color: "#8B978F" }}>
            Frais = 1 % de la valeur nette totale, plafonnés entre le minimum et le maximum ci-dessus.
            L'Éthiopie applique un minimum plus élevé ({INSPECTION.USD.symbol}{INSPECTION.USD.minEthiopia} /
            {" "}{INSPECTION.EUR.symbol}{INSPECTION.EUR.minEthiopia}). Les frais s'appliquent au-delà de
            2 000 $ de valeur nette — sauf pour la Tanzanie, où le seuil est de 5 000 $.
          </p>
        </div>

        {/* ---------------- CONDITIONS ---------------- */}
        <div className="mt-8 rounded-2xl p-6" style={{ background: "#FBFAF6", border: "1px solid #E4DFD1" }}>
          <div className="flex items-center gap-2 mb-3">
            <Info size={15} color="#6E7C87" />
            <h3 className="ff-display text-sm font-semibold uppercase tracking-wide" style={{ color: "#6E7C87" }}>
              Conditions
            </h3>
          </div>
          <ul className="text-xs space-y-1.5" style={{ color: "#7C8891" }}>
            <li>Le tarif ci-dessus n'est qu'une estimation, à usage de devis uniquement.</li>
            <li>Le calcul est soumis au taux de change et sera mis à jour en cas de variation extrême de celui-ci.</li>
            <li>Les tarifs excluent tout coût supplémentaire requis pour un excès de longueur ou de hauteur par la compagnie aérienne, au-delà de la norme.</li>
            <li>Des coûts additionnels peuvent s'appliquer en cas de disponibilité limitée sur les avions cargo, lorsque les marchandises sont reportées sur d'autres vols, entraînant des retards.</li>
            <li>Si le poids brut est inexact en raison de dimensions importantes, le volume des marchandises sera utilisé à la place.</li>
            <li>Les frais de transport aérien réels seront facturés une fois communiqués par le transitaire, sur présentation d'une liste de colisage.</li>
            <li>Grundfos ne peut être tenu responsable des coûts imprévus s'ajoutant aux tarifs calculés.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
