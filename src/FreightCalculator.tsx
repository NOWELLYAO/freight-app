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
  Landmark,
  Percent,
  CreditCard,
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
// PRIX DE REVIENT CÔTE D'IVOIRE — constants sourced from "Transit Douane L3"
// course support (M. Moumouny DIANE), chapters 3 & 5.
// ---------------------------------------------------------------------------

// Droit de Douane rate by TEC tariff category (0 to 4)
const TEC_DD_RATES = [0, 0.05, 0.10, 0.20, 0.35];

const CI_RATES = {
  rsta: 0.01, // Redevance Statistique
  pcs: 0.008, // Prélèvement Communautaire UEMOA
  pcc: 0.005, // Prélèvement Communautaire CEDEAO
  pua: 0.002, // Prélèvement Union Africaine
  tvaDouane: 0.18,
  tvaVente: 0.18,
  tsd: 20000, // Travail Supplémentaire Douane (XOF, fixe/déclaration)
  rpiRate: 0.0075, // 0.75% du FOB
  rpiMin: 100000, // minimum XOF
  agioTresorTaux: 0.002, // 2‰ des droits & taxes, si paiement à crédit
  primeAssMin: 5000, // plancher prime nette (XOF)
  fraisAccessoiresAssurance: 2500, // XOF, fixe
  majAssuranceParDefaut: 1.10, // VA = CFR x 1.10
} as const;

const MODE_MAJORATIONS: Record<string, number> = {
  "Aérien": 0.07,
  "Terrestre": 0.145,
  "Maritime": 0,
};

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

  // Prix de Revient Côte d'Ivoire
  type Article = { id: string; designation: string; quantite: string; prixUnitaire: string; poidsBrut: string };
  const [ciArticles, setCiArticles] = useState<Article[]>([
    { id: "a1", designation: "Pompe centrifuge", quantite: "1", prixUnitaire: "5700", poidsBrut: "" },
  ]);
  const [ciFret, setCiFret] = useState<string>("500");
  const [ciMode, setCiMode] = useState<string>("Aérien");
  const [ciTauxChange, setCiTauxChange] = useState<string>("655.957");
  const [ciCategorie, setCiCategorie] = useState<string>("1");
  const [ciTauxPrime, setCiTauxPrime] = useState<string>("0.4");
  const [ciPaiementCredit, setCiPaiementCredit] = useState<boolean>(false);
  const [ciMarge, setCiMarge] = useState<string>("20");

  // Débours divers & HAD : calcul automatique (estimation) ou saisie manuelle (montants réels de facture)
  const [ciDeboursMode, setCiDeboursMode] = useState<"auto" | "manuel">("auto");
  const [ciDeboursDiversManuel, setCiDeboursDiversManuel] = useState<string>("");
  const [ciHadManuel, setCiHadManuel] = useState<string>("");

  const addArticle = () => {
    setCiArticles((arr) => [
      ...arr,
      { id: `a${Date.now()}`, designation: `Article ${arr.length + 1}`, quantite: "1", prixUnitaire: "0", poidsBrut: "" },
    ]);
  };
  const removeArticle = (id: string) => {
    setCiArticles((arr) => (arr.length > 1 ? arr.filter((a) => a.id !== id) : arr));
  };
  const updateArticle = (id: string, field: keyof Article, value: string) => {
    setCiArticles((arr) => arr.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  };

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

  // ---- Prix de Revient Côte d'Ivoire — multi-articles ----
  const isDestinationCI = row.country === "Côte d'Ivoire";

  const ciFretNum = Math.max(0, Number(ciFret) || 0);
  const ciTauxChangeNum = Math.max(0, Number(ciTauxChange) || 655.957);
  const ciCategorieNum = Math.min(4, Math.max(0, Number(ciCategorie) || 0));
  const ciTauxPrimeNum = Math.max(0, Number(ciTauxPrime) || 0) / 100;
  const ciMargeNum = Math.max(0, Number(ciMarge) || 0) / 100;
  const ciDdTaux = TEC_DD_RATES[ciCategorieNum] ?? 0.05;
  const ciMajModeTaux = MODE_MAJORATIONS[ciMode] ?? 0;

  const ciArticlesCalc = ciArticles.map((a) => {
    const qty = Math.max(0, Number(a.quantite) || 0);
    const pu = Math.max(0, Number(a.prixUnitaire) || 0);
    const pb = Math.max(0, Number(a.poidsBrut) || 0);
    return { ...a, qtyNum: qty, puNum: pu, pbNum: pb, fobEur: qty * pu, poidsBrutTotal: qty * pb };
  });

  const ciQuantiteTotale = ciArticlesCalc.reduce((s, a) => s + a.qtyNum, 0);
  const ciFobTotalEur = ciArticlesCalc.reduce((s, a) => s + a.fobEur, 0);
  const ciPoidsBrutTotal = ciArticlesCalc.reduce((s, a) => s + a.poidsBrutTotal, 0);
  const repartirParPoids = ciPoidsBrutTotal > 0;

  const ciFobXof = ciFobTotalEur * ciTauxChangeNum;
  const ciFretXof = ciFretNum * ciTauxChangeNum;
  const ciCfrXof = ciFobXof + ciFretXof;
  const ciValeurAssuree = ciCfrXof * CI_RATES.majAssuranceParDefaut;
  const ciPrimeNette = Math.max(ciValeurAssuree * ciTauxPrimeNum, CI_RATES.primeAssMin);
  const ciPrimeDefinitive = (ciPrimeNette + CI_RATES.fraisAccessoiresAssurance) * (1 + ciMajModeTaux);
  const ciValeurDouane = ciCfrXof + ciPrimeDefinitive;

  const ciDroitDouane = ciValeurDouane * ciDdTaux;
  const ciRsta = ciValeurDouane * CI_RATES.rsta;
  const ciPcs = ciValeurDouane * CI_RATES.pcs;
  const ciPcc = ciValeurDouane * CI_RATES.pcc;
  const ciPua = ciValeurDouane * CI_RATES.pua;
  const ciTsd = CI_RATES.tsd;
  const ciRpi = Math.max(ciFobXof * CI_RATES.rpiRate, CI_RATES.rpiMin);
  const ciTvaDouane = (ciValeurDouane + ciDroitDouane + ciRsta) * CI_RATES.tvaDouane;
  const ciSousTotalDT = ciDroitDouane + ciRsta + ciPcs + ciPcc + ciPua + ciTsd + ciRpi + ciTvaDouane;
  const ciAgioTresor = ciPaiementCredit ? ciSousTotalDT * CI_RATES.agioTresorTaux : 0;
  const ciTotalDeboursDouane = ciSousTotalDT + ciAgioTresor;

  const ciDeboursDiversNum =
    ciDeboursMode === "manuel" ? Math.max(0, Number(ciDeboursDiversManuel) || 0) : 0;
  const ciHadNum = ciDeboursMode === "manuel" ? Math.max(0, Number(ciHadManuel) || 0) : 0;
  const ciAutresFrais = ciDeboursDiversNum + ciHadNum;

  const ciPrixRevientTotal = ciValeurDouane + ciTotalDeboursDouane + ciAutresFrais;
  const ciPrixRevientUnitaire = ciQuantiteTotale > 0 ? ciPrixRevientTotal / ciQuantiteTotale : 0;
  const ciPrixVenteHT = ciPrixRevientTotal * (1 + ciMargeNum);
  const ciPrixVenteTTC = ciPrixVenteHT * (1 + CI_RATES.tvaVente);
  const ciPrixVenteUnitaireTTC = ciQuantiteTotale > 0 ? ciPrixVenteTTC / ciQuantiteTotale : 0;

  // Répartition par ligne d'article : au prorata du poids brut si renseigné, sinon de la valeur FOB
  const ciArticlesBreakdown = ciArticlesCalc.map((a) => {
    const part = repartirParPoids
      ? ciPoidsBrutTotal > 0
        ? a.poidsBrutTotal / ciPoidsBrutTotal
        : 0
      : ciFobTotalEur > 0
      ? a.fobEur / ciFobTotalEur
      : 0;
    const prixRevientLigne = ciPrixRevientTotal * part;
    const prixRevientUnitaireLigne = a.qtyNum > 0 ? prixRevientLigne / a.qtyNum : 0;
    return { ...a, part, prixRevientLigne, prixRevientUnitaireLigne };
  });

  const useCalculatedFreight = () => {
    setCiFret(totalFreight.toFixed(2));
  };

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

        {/* ---------------- PRIX DE REVIENT CÔTE D'IVOIRE ---------------- */}
        <div className="mt-8 rounded-2xl overflow-hidden" style={{ background: "#152634" }}>
          <div className="px-6 pt-5 pb-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Landmark size={16} color="#E8A33D" />
              <h2 className="ff-display text-sm font-semibold uppercase tracking-wide" style={{ color: "#F5F2EA" }}>
                Prix de Revient — Importation Côte d'Ivoire
              </h2>
            </div>
            {isDestinationCI && (
              <span
                className="ff-mono text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: "#E8A33D", color: "#152634", fontWeight: 600 }}
              >
                DESTINATION SÉLECTIONNÉE CI-DESSUS
              </span>
            )}
          </div>
          <p className="px-6 text-xs pb-4" style={{ color: "#8FA3B0" }}>
            Formules sourcées du support de cours « Transit Douane, Licence 3 » (M. Moumouny DIANE) —
            droits et taxes du Tarif Extérieur Commun UEMOA/CEDEAO.
          </p>

          {/* ---- Articles ---- */}
          <div className="px-6 pb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] uppercase tracking-wide" style={{ color: "#8FA3B0" }}>
                Articles de la commande
              </label>
              <button
                onClick={addArticle}
                className="text-[11px] px-2 py-1 rounded-md font-medium"
                style={{ background: "#3D5A73", color: "#F5F2EA" }}
              >
                + Ajouter une ligne
              </button>
            </div>
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #33526A" }}>
              <div
                className="grid gap-px text-[10px] uppercase px-2 py-1.5"
                style={{ gridTemplateColumns: "2fr 0.8fr 1fr 1fr 0.3fr", background: "#0F1E29", color: "#8FA3B0" }}
              >
                <span>Désignation</span>
                <span>Qté</span>
                <span>PU FOB (€)</span>
                <span>Poids brut/u (kg)</span>
                <span></span>
              </div>
              {ciArticles.map((a) => (
                <div
                  key={a.id}
                  className="grid gap-px px-2 py-1.5 items-center"
                  style={{ gridTemplateColumns: "2fr 0.8fr 1fr 1fr 0.3fr", background: "#1F374A", borderTop: "1px solid #33526A" }}
                >
                  <input
                    value={a.designation}
                    onChange={(e) => updateArticle(a.id, "designation", e.target.value)}
                    className="rounded py-1 px-1.5 text-xs outline-none"
                    style={{ background: "#F5F2EA", color: "#152634" }}
                  />
                  <input
                    type="number" min={0} value={a.quantite}
                    onChange={(e) => updateArticle(a.id, "quantite", e.target.value)}
                    className="rounded py-1 px-1.5 text-xs outline-none ff-mono"
                    style={{ background: "#F5F2EA", color: "#152634" }}
                  />
                  <input
                    type="number" min={0} value={a.prixUnitaire}
                    onChange={(e) => updateArticle(a.id, "prixUnitaire", e.target.value)}
                    className="rounded py-1 px-1.5 text-xs outline-none ff-mono"
                    style={{ background: "#F5F2EA", color: "#152634" }}
                  />
                  <input
                    type="number" min={0} value={a.poidsBrut} placeholder="optionnel"
                    onChange={(e) => updateArticle(a.id, "poidsBrut", e.target.value)}
                    className="rounded py-1 px-1.5 text-xs outline-none ff-mono"
                    style={{ background: "#F5F2EA", color: "#152634" }}
                  />
                  <button
                    onClick={() => removeArticle(a.id)}
                    className="text-xs"
                    style={{ color: "#E27D5C" }}
                    title="Supprimer la ligne"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[10px] mt-1.5" style={{ color: "#8FA3B0" }}>
              Le fret et les frais sont répartis entre les lignes au prorata du <strong>poids brut</strong> si
              renseigné, sinon au prorata de la <strong>valeur FOB</strong> (cours ch.6 : méthode de traitement
              d'un dossier à plusieurs articles).
            </p>
          </div>

          <div className="px-6 pb-6 grid md:grid-cols-2 gap-6" style={{ background: "#1F374A" }}>
            {/* Inputs */}
            <div className="pt-6">
              <label className="block text-[11px] mb-1" style={{ color: "#8FA3B0" }}>Fret jusqu'à Abidjan (€, toute la commande)</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="number" min={0} value={ciFret}
                  onChange={(e) => setCiFret(e.target.value)}
                  className="flex-1 rounded-lg py-2 px-3 text-sm font-medium outline-none ff-mono"
                  style={{ background: "#F5F2EA", border: "1px solid #33526A", color: "#152634" }}
                />
                <button
                  onClick={useCalculatedFreight}
                  className="px-3 rounded-lg text-[11px] font-medium whitespace-nowrap"
                  style={{ background: "#E8A33D", color: "#152634" }}
                  title="Reprendre le Total des frais de fret calculé plus haut"
                >
                  ↑ Reprendre le fret
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[11px] mb-1" style={{ color: "#8FA3B0" }}>Mode de transport</label>
                  <select
                    value={ciMode}
                    onChange={(e) => setCiMode(e.target.value)}
                    className="w-full rounded-lg py-2 px-3 text-sm font-medium outline-none"
                    style={{ background: "#F5F2EA", border: "1px solid #33526A", color: "#152634" }}
                  >
                    <option value="Aérien">Aérien (+7% assurance)</option>
                    <option value="Maritime">Maritime (neutre)</option>
                    <option value="Terrestre">Terrestre (+14,5% assurance)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] mb-1" style={{ color: "#8FA3B0" }}>Catégorie TEC (0–4)</label>
                  <select
                    value={ciCategorie}
                    onChange={(e) => setCiCategorie(e.target.value)}
                    className="w-full rounded-lg py-2 px-3 text-sm font-medium outline-none"
                    style={{ background: "#F5F2EA", border: "1px solid #33526A", color: "#152634" }}
                  >
                    <option value="0">Cat. 0 — DD 0%</option>
                    <option value="1">Cat. 1 — DD 5%</option>
                    <option value="2">Cat. 2 — DD 10%</option>
                    <option value="3">Cat. 3 — DD 20%</option>
                    <option value="4">Cat. 4 — DD 35%</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[11px] mb-1" style={{ color: "#8FA3B0" }}>Taux de change (1€=XOF)</label>
                  <input
                    type="number" min={0} value={ciTauxChange}
                    onChange={(e) => setCiTauxChange(e.target.value)}
                    className="w-full rounded-lg py-2 px-3 text-sm font-medium outline-none ff-mono"
                    style={{ background: "#F5F2EA", border: "1px solid #33526A", color: "#152634" }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] mb-1" style={{ color: "#8FA3B0" }}>Taux prime assurance (%)</label>
                  <input
                    type="number" min={0} step={0.01} value={ciTauxPrime}
                    onChange={(e) => setCiTauxPrime(e.target.value)}
                    className="w-full rounded-lg py-2 px-3 text-sm font-medium outline-none ff-mono"
                    style={{ background: "#F5F2EA", border: "1px solid #33526A", color: "#152634" }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3 items-end">
                <div>
                  <label className="block text-[11px] mb-1" style={{ color: "#8FA3B0" }}>Marge bénéficiaire (%)</label>
                  <input
                    type="number" min={0} value={ciMarge}
                    onChange={(e) => setCiMarge(e.target.value)}
                    className="w-full rounded-lg py-2 px-3 text-sm font-medium outline-none ff-mono"
                    style={{ background: "#F5F2EA", border: "1px solid #33526A", color: "#152634" }}
                  />
                </div>
                <button
                  onClick={() => setCiPaiementCredit(!ciPaiementCredit)}
                  className="flex items-center gap-2 rounded-lg py-2 px-3 text-xs font-medium"
                  style={{
                    background: ciPaiementCredit ? "#E8A33D" : "#F5F2EA",
                    color: "#152634",
                    border: "1px solid #33526A",
                  }}
                >
                  <CreditCard size={13} />
                  Crédit d'enlèvement {ciPaiementCredit ? "activé" : "désactivé"}
                </button>
              </div>
              <p className="text-[10px] mb-4" style={{ color: "#8FA3B0" }}>
                L'Agio Trésor (2‰ des droits et taxes) ne s'applique qu'en cas de paiement à crédit.
              </p>

              {/* Débours divers & HAD : auto ou manuel */}
              <div className="rounded-lg p-3" style={{ background: "#0F1E29", border: "1px solid #33526A" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase tracking-wide" style={{ color: "#8FA3B0" }}>
                    Débours divers &amp; H.A.D.
                  </span>
                  <div className="flex rounded-md overflow-hidden" style={{ border: "1px solid #33526A" }}>
                    <button
                      onClick={() => setCiDeboursMode("auto")}
                      className="text-[10px] px-2 py-1"
                      style={{ background: ciDeboursMode === "auto" ? "#3D5A73" : "transparent", color: "#F5F2EA" }}
                    >
                      Non inclus
                    </button>
                    <button
                      onClick={() => setCiDeboursMode("manuel")}
                      className="text-[10px] px-2 py-1"
                      style={{ background: ciDeboursMode === "manuel" ? "#E8A33D" : "transparent", color: ciDeboursMode === "manuel" ? "#152634" : "#F5F2EA" }}
                    >
                      Saisie manuelle
                    </button>
                  </div>
                </div>
                {ciDeboursMode === "manuel" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] mb-1" style={{ color: "#8FA3B0" }}>Débours divers réels (XOF)</label>
                      <input
                        type="number" min={0} value={ciDeboursDiversManuel}
                        onChange={(e) => setCiDeboursDiversManuel(e.target.value)}
                        placeholder="ex. 3 478 184"
                        className="w-full rounded-lg py-1.5 px-2 text-xs font-medium outline-none ff-mono"
                        style={{ background: "#F5F2EA", color: "#152634" }}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] mb-1" style={{ color: "#8FA3B0" }}>H.A.D. réel (XOF)</label>
                      <input
                        type="number" min={0} value={ciHadManuel}
                        onChange={(e) => setCiHadManuel(e.target.value)}
                        placeholder="ex. 412 209"
                        className="w-full rounded-lg py-1.5 px-2 text-xs font-medium outline-none ff-mono"
                        style={{ background: "#F5F2EA", color: "#152634" }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px]" style={{ color: "#8FA3B0" }}>
                    Ces frais (magasinage, surestarie, ISPS, honoraires transitaire...) ne sont pas standardisés —
                    non estimés ici. Basculez sur « Saisie manuelle » et reportez les montants de votre facture réelle.
                  </p>
                )}
              </div>
            </div>

            {/* Breakdown */}
            <div className="pt-6">
              <div className="rounded-lg p-4 mb-3" style={{ background: "#152634" }}>
                <div className="text-[11px] uppercase tracking-wide mb-2" style={{ color: "#8FA3B0" }}>
                  Valeur en douane (CAF)
                </div>
                <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                  <span style={{ color: "#8FA3B0" }}>Valeur FOB ({fmt(ciQuantiteTotale, 0)} unités)</span>
                  <span className="ff-mono text-right text-white">{fmt(ciFobXof, 0)} XOF</span>
                  <span style={{ color: "#8FA3B0" }}>Fret</span>
                  <span className="ff-mono text-right text-white">{fmt(ciFretXof, 0)} XOF</span>
                  <span style={{ color: "#8FA3B0" }}>Prime d'assurance</span>
                  <span className="ff-mono text-right text-white">{fmt(ciPrimeDefinitive, 0)} XOF</span>
                  <span className="font-semibold" style={{ color: "#E8A33D" }}>Valeur en Douane</span>
                  <span className="ff-mono text-right font-semibold" style={{ color: "#E8A33D" }}>{fmt(ciValeurDouane, 0)} XOF</span>
                </div>
              </div>

              <div className="rounded-lg p-4 mb-3" style={{ background: "#152634" }}>
                <div className="text-[11px] uppercase tracking-wide mb-2" style={{ color: "#8FA3B0" }}>
                  Débours douane (TEC)
                </div>
                <div className="grid grid-cols-2 gap-y-1 text-xs">
                  <span style={{ color: "#8FA3B0" }}>Droit de Douane ({(ciDdTaux * 100).toFixed(0)}%)</span>
                  <span className="ff-mono text-right text-white">{fmt(ciDroitDouane, 0)}</span>
                  <span style={{ color: "#8FA3B0" }}>RSTA (1%)</span>
                  <span className="ff-mono text-right text-white">{fmt(ciRsta, 0)}</span>
                  <span style={{ color: "#8FA3B0" }}>PCS + PCC + PUA</span>
                  <span className="ff-mono text-right text-white">{fmt(ciPcs + ciPcc + ciPua, 0)}</span>
                  <span style={{ color: "#8FA3B0" }}>TSD (fixe)</span>
                  <span className="ff-mono text-right text-white">{fmt(ciTsd, 0)}</span>
                  <span style={{ color: "#8FA3B0" }}>RPI (0,75% FOB, min 100k)</span>
                  <span className="ff-mono text-right text-white">{fmt(ciRpi, 0)}</span>
                  <span style={{ color: "#8FA3B0" }}>TVA (18%)</span>
                  <span className="ff-mono text-right text-white">{fmt(ciTvaDouane, 0)}</span>
                  {ciPaiementCredit && (
                    <>
                      <span style={{ color: "#8FA3B0" }}>Agio Trésor (2‰)</span>
                      <span className="ff-mono text-right text-white">{fmt(ciAgioTresor, 0)}</span>
                    </>
                  )}
                  {ciDeboursMode === "manuel" && (
                    <>
                      <span style={{ color: "#8FA3B0" }}>Débours divers + H.A.D. (saisis)</span>
                      <span className="ff-mono text-right text-white">{fmt(ciAutresFrais, 0)}</span>
                    </>
                  )}
                  <span className="font-semibold" style={{ color: "#E8A33D" }}>Total Débours Douane</span>
                  <span className="ff-mono text-right font-semibold" style={{ color: "#E8A33D" }}>{fmt(ciTotalDeboursDouane, 0)} XOF</span>
                </div>
              </div>

              <div className="rounded-lg p-4" style={{ background: "#E8A33D" }}>
                <div className="flex items-center gap-2 mb-1">
                  <Percent size={13} color="#152634" />
                  <span className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: "#152634" }}>
                    Prix de revient total
                  </span>
                </div>
                <div className="ff-display text-2xl font-semibold" style={{ color: "#152634" }}>
                  {fmt(ciPrixRevientTotal, 0)} XOF
                </div>
                <div className="text-xs" style={{ color: "#4A3A16" }}>
                  soit {fmt(ciPrixRevientTotal / ciTauxChangeNum, 2)} € · {fmt(ciPrixRevientUnitaire, 0)} XOF / unité (moyenne)
                </div>
                <div className="h-px my-3" style={{ background: "#152634", opacity: 0.15 }} />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: "#152634" }}>
                    Prix de vente TTC (marge {ciMarge}%)
                  </span>
                  <span className="ff-display text-lg font-semibold" style={{ color: "#152634" }}>
                    {fmt(ciPrixVenteTTC, 0)} XOF
                  </span>
                </div>
                <div className="text-[11px] text-right" style={{ color: "#4A3A16" }}>
                  {fmt(ciPrixVenteUnitaireTTC, 0)} XOF / unité (moyenne)
                </div>
              </div>
            </div>
          </div>

          {/* ---- Répartition par ligne d'article ---- */}
          <div className="px-6 pb-6" style={{ background: "#1F374A" }}>
            <div className="text-[11px] uppercase tracking-wide mb-2 pt-2" style={{ color: "#8FA3B0" }}>
              Prix de revient réparti par ligne ({repartirParPoids ? "au prorata du poids brut" : "au prorata de la valeur FOB"})
            </div>
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #33526A" }}>
              <div
                className="grid gap-px text-[10px] uppercase px-3 py-1.5"
                style={{ gridTemplateColumns: "2fr 0.8fr 0.8fr 1.2fr 1.2fr", background: "#0F1E29", color: "#8FA3B0" }}
              >
                <span>Article</span>
                <span>Qté</span>
                <span>Part</span>
                <span className="text-right">Prix de revient total</span>
                <span className="text-right">Prix de revient / unité</span>
              </div>
              {ciArticlesBreakdown.map((a) => (
                <div
                  key={a.id}
                  className="grid gap-px px-3 py-2 items-center text-xs"
                  style={{ gridTemplateColumns: "2fr 0.8fr 0.8fr 1.2fr 1.2fr", background: "#152634", borderTop: "1px solid #33526A" }}
                >
                  <span className="text-white">{a.designation || "—"}</span>
                  <span className="ff-mono text-white">{fmt(a.qtyNum, 0)}</span>
                  <span className="ff-mono" style={{ color: "#8FA3B0" }}>{fmt(a.part * 100, 1)}%</span>
                  <span className="ff-mono text-right text-white">{fmt(a.prixRevientLigne, 0)} XOF</span>
                  <span className="ff-mono text-right font-semibold" style={{ color: "#E8A33D" }}>{fmt(a.prixRevientUnitaireLigne, 0)} XOF</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] px-6 py-3" style={{ background: "#152634", color: "#6E8299" }}>
            Estimation à usage de devis uniquement. En mode « Non inclus », le prix de revient exclut les
            débours divers et le H.A.D. — basculez en saisie manuelle pour les intégrer avec vos montants réels.
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
