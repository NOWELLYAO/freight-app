// ---------------------------------------------------------------------------
// DATA — transcribed literally from "Freight Calculation Extranet June 2026.xlsx"
// ---------------------------------------------------------------------------

export type Row = {
  country: string;
  airport: string;
  rate: number; // €/kg
  min: number; // Air Freight Min (flat charge in € / departure currency)
  inspection: "Required" | "Not Required";
  estimated?: boolean; // true = not in the original source file, interpolated from comparable routes
};

export const DEPARTURES: Record<string, Row[]> = {
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

export const INCO_TERM = "CPT Port of Discharge";

// Inspection Fees Calculator constants (from sheet, USD & EURO blocks)
export const INSPECTION = {
  USD: { min: 265, minEthiopia: 1200, max: 5000, symbol: "$", label: "USD" },
  EUR: { min: 243, minEthiopia: 1000, max: 4500, symbol: "€", label: "EUR" },
} as const;

export type Currency = keyof typeof INSPECTION;

// ---------------------------------------------------------------------------
// PRIX DE REVIENT CÔTE D'IVOIRE — constants sourced from "Transit Douane L3"
// course support (M. Moumouny DIANE), chapters 3 & 5.
// ---------------------------------------------------------------------------

// Droit de Douane rate by TEC tariff category (0 to 4)
export const TEC_DD_RATES = [0, 0.05, 0.10, 0.20, 0.35];

export const CI_RATES = {
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

export const MODE_MAJORATIONS: Record<string, number> = {
  "Aérien": 0.07,
  "Terrestre": 0.145,
  "Maritime": 0,
};

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

export const fmt = (n: number, digits = 2) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const inspectionLabel = (v: "Required" | "Not Required") =>
  v === "Required" ? "Requise" : "Non requise";

// ---------------------------------------------------------------------------
// BRIDGE — passes the calculated freight total from the Fret page to the
// Prix de Revient page (two separate routes, no shared React state).
// ---------------------------------------------------------------------------

const BRIDGE_KEY = "grundfos_freight_bridge_v1";

export type FreightBridge = {
  totalEur: number;
  departure: string;
  country: string;
  airport: string;
};

export function saveFreightBridge(data: FreightBridge) {
  try {
    localStorage.setItem(BRIDGE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage errors (private browsing, etc.)
  }
}

export function loadFreightBridge(): FreightBridge | null {
  try {
    const raw = localStorage.getItem(BRIDGE_KEY);
    return raw ? (JSON.parse(raw) as FreightBridge) : null;
  } catch {
    return null;
  }
}
