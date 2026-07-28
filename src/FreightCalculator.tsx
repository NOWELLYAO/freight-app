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
    { country: "Tanzania", airport: "Dar es Salaam", rate: 7, min: 250, inspection: "Required" },
    { country: "Uganda", airport: "Entebbe", rate: 7, min: 250, inspection: "Required" },
    { country: "Burkina Faso", airport: "Ouagadougou", rate: 12, min: 250, inspection: "Required" },
    { country: "Congo", airport: "Kinshasa", rate: 12, min: 250, inspection: "Not Required" },
    { country: "Djibouti", airport: "Djibouti-Ambouli", rate: 18, min: 250, inspection: "Required" },
    { country: "Ghana", airport: "Accra", rate: 6.5, min: 250, inspection: "Required" },
    { country: "Nigeria", airport: "Lagos", rate: 7, min: 250, inspection: "Required" },
    { country: "Senegal", airport: "Dakar", rate: 8.5, min: 250, inspection: "Required" },
    { country: "Côte d'Ivoire", airport: "Abidjan", rate: 8, min: 250, inspection: "Required", estimated: true },
    { country: "Ethiopia", airport: "Addis Ababa", rate: 7.5, min: 250, inspection: "Required" },
    { country: "Chad", airport: "Exeter", rate: 9.5, min: 250, inspection: "Required" },
    { country: "Cameroon", airport: "Douala", rate: 9.5, min: 250, inspection: "Required" },
    { country: "South Africa", airport: "Johannesburg", rate: 7, min: 250, inspection: "Not Required" },
  ],
  Johannesburg: [
    { country: "Kenya", airport: "Nairobi", rate: 9, min: 290, inspection: "Required" },
    { country: "Malawi", airport: "Kamuzu", rate: 6, min: 290, inspection: "Not Required" },
    { country: "Tanzania", airport: "Dar es Salaam", rate: 11, min: 290, inspection: "Required" },
    { country: "Uganda", airport: "Entebbe", rate: 10, min: 290, inspection: "Required" },
    { country: "Zambia", airport: "Lusaka", rate: 13, min: 290, inspection: "Not Required" },
    { country: "Mauritius", airport: "Mauritius", rate: 7, min: 290, inspection: "Not Required" },
    { country: "Côte d'Ivoire", airport: "Abidjan", rate: 15, min: 290, inspection: "Required" },
    { country: "Mozambique", airport: "Maputo", rate: 11, min: 290, inspection: "Not Required" },
    { country: "Burkina Faso", airport: "Ouagadougou", rate: 8, min: 290, inspection: "Required" },
    { country: "Congo", airport: "Kinshasa", rate: 6, min: 290, inspection: "Not Required" },
    { country: "Djibouti", airport: "Djibouti-Ambouli", rate: 4, min: 290, inspection: "Required" },
    { country: "Ethiopia", airport: "Addis Ababa", rate: 4.5, min: 290, inspection: "Required" },
    { country: "Ghana", airport: "Accra", rate: 5.5, min: 290, inspection: "Required" },
    { country: "Mali", airport: "Bamako–Sénou", rate: 8.5, min: 290, inspection: "Required" },
    { country: "Nigeria", airport: "Lagos", rate: 6, min: 290, inspection: "Required" },
    { country: "Rwanda", airport: "Kigali", rate: 6, min: 290, inspection: "Required" },
    { country: "Senegal", airport: "Dakar", rate: 6.5, min: 290, inspection: "Required" },
    { country: "Seychelles", airport: "Seychelles", rate: 4, min: 290, inspection: "Not Required" },
    { country: "Sierra Leone", airport: "Lungi", rate: 8, min: 290, inspection: "Not Required" },
    { country: "South Sudan", airport: "Malakal", rate: 6.5, min: 290, inspection: "Required" },
    { country: "Togo", airport: "Gnassingbé Eyadéma", rate: 6.5, min: 290, inspection: "Required" },
    { country: "Zimbabwe", airport: "Harare", rate: 4, min: 290, inspection: "Not Required" },
    { country: "Gambia", airport: "Banjul", rate: 7.5, min: 290, inspection: "Not Required" },
    { country: "Cameroon", airport: "Douala", rate: 7, min: 290, inspection: "Required" },
    { country: "Chad", airport: "Exeter", rate: 9, min: 290, inspection: "Required" },
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
  n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

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
  const minCharge = row.country === "Ethiopia" ? insp.minEthiopia : insp.min;
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

      <div className="max-w-5xl mx-auto px-6 py-12">
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
            Grundfos · Air Export Network
          </span>
        </div>
        <h1 className="ff-display text-4xl sm:text-5xl font-semibold leading-tight mb-2">
          Freight &amp; Inspection Calculator
        </h1>
        <p className="text-base max-w-xl" style={{ color: "#5B6A75" }}>
          Select a departure hub and destination, enter the gross weight, and
          get an instant quoting estimate — plus the destination's inspection
          fee.
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
                Shipment Details
              </h2>
            </div>

            {/* Departure toggle */}
            <label className="block text-xs font-medium mb-2" style={{ color: "#6E7C87" }}>
              Departure
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
              Country of Destination
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
                    {r.country} — {r.airport}{r.estimated ? " (estimated)" : ""}
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
                  Rate estimated by interpolation from comparable West-African routes (Senegal, Ghana) —
                  not present in the original source file. Confirm with the forwarder before quoting.
                </span>
              </div>
            )}

            {/* INCO term (fixed) */}
            <label className="block text-xs font-medium mb-2" style={{ color: "#6E7C87" }}>
              INCO Term
            </label>
            <div
              className="w-full rounded-lg py-2.5 px-3 text-sm mb-5"
              style={{ background: "#F5F2EA", border: "1px solid #E4DFD1", color: "#5B6A75" }}
            >
              {INCO_TERM}
            </div>

            {/* Weight */}
            <label className="block text-xs font-medium mb-2" style={{ color: "#6E7C87" }}>
              Gross Weight (Kg)
            </label>
            <input
              type="number"
              min={0}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 600"
              className="w-full rounded-lg py-2.5 px-3 text-sm font-medium outline-none mb-1 ff-mono"
              style={{ background: "#F5F2EA", border: "1px solid #E4DFD1", color: "#152634" }}
            />
            <p className="text-xs" style={{ color: "#8B978F" }}>
              If gross weight is inaccurate due to large dimensions, volumetric weight will be used instead.
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
                  Air Waybill Estimate
                </span>
                <span
                  className="ff-mono text-[11px] px-2 py-0.5 rounded-full"
                  style={{ background: "#E8A33D", color: "#152634", fontWeight: 600 }}
                >
                  {departure.toUpperCase()}
                </span>
              </div>

              {/* route line */}
              <div className="flex items-center gap-3 px-6 pt-6 pb-5">
                <div className="flex-1">
                  <div className="ff-display text-2xl font-semibold">{departure}</div>
                  <div className="ff-mono text-[11px]" style={{ color: "#8FA3B0" }}>ORIGIN</div>
                </div>
                <div className="flex-1 flex items-center gap-2 px-2">
                  <div className="flex-1 h-px" style={{ background: "#3D5A73" }} />
                  <Plane size={16} color="#E8A33D" />
                  <div className="flex-1 h-px" style={{ background: "#3D5A73" }} />
                </div>
                <div className="flex-1 text-right">
                  <div className="ff-display text-2xl font-semibold">{row.airport}</div>
                  <div className="ff-mono text-[11px]" style={{ color: "#8FA3B0" }}>{row.country.toUpperCase()}</div>
                </div>
              </div>
              {row.estimated && (
                <div className="px-6 pb-4 -mt-2">
                  <span
                    className="ff-mono text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: "#3D5A73", color: "#F5F2EA" }}
                  >
                    ESTIMATED RATE — CONFIRM BEFORE QUOTING
                  </span>
                </div>
              )}

              {/* perforation */}
              <div className="waybill-notch h-4" style={{ background: "#1F374A" }} />

              {/* breakdown */}
              <div className="px-6 py-6" style={{ background: "#1F374A" }}>
                <div className="grid grid-cols-2 gap-y-3 text-sm mb-5">
                  <span style={{ color: "#8FA3B0" }}>Gross Weight</span>
                  <span className="ff-mono text-right">{fmt(weightNum, 0)} kg</span>

                  <span style={{ color: "#8FA3B0" }}>Rate</span>
                  <span className="ff-mono text-right">€{fmt(row.rate)} / kg</span>

                  <span style={{ color: "#8FA3B0" }}>Air Freight Min</span>
                  <span className="ff-mono text-right">€{fmt(row.min, 0)}</span>

                  <span style={{ color: "#8FA3B0" }}>Weight × Rate</span>
                  <span className="ff-mono text-right">€{fmt(byWeight)}</span>
                </div>

                <div className="flex items-center justify-between pt-4" style={{ borderTop: "1px solid #33526A" }}>
                  <div>
                    <div className="text-xs uppercase tracking-wide" style={{ color: "#8FA3B0" }}>
                      Total Freight Charges
                    </div>
                    {minApplied && (
                      <div className="text-[11px] mt-0.5" style={{ color: "#E8A33D" }}>
                        Minimum charge applied
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
                  Inspection fees for {row.country}:
                </span>
                <span
                  className="ff-mono text-xs font-semibold"
                  style={{ color: row.inspection === "Required" ? "#E27D5C" : "#6FB58A" }}
                >
                  {row.inspection}
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
                Inspection Fees Calculator
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
                Total Net Value ({currency})
              </label>
              <input
                type="number"
                min={0}
                value={netValue}
                onChange={(e) => setNetValue(e.target.value)}
                placeholder="Quote value excl. freight"
                className="w-full rounded-lg py-2.5 px-3 text-sm font-medium outline-none ff-mono"
                style={{ background: "#F5F2EA", border: "1px solid #E4DFD1", color: "#152634" }}
              />
            </div>

            <div>
              <div className="text-xs font-medium mb-2" style={{ color: "#6E7C87" }}>Reference Range</div>
              <div
                className="rounded-lg py-2.5 px-3 text-sm ff-mono"
                style={{ background: "#F5F2EA", border: "1px solid #E4DFD1", color: "#5B6A75" }}
              >
                {insp.symbol}{fmt(minCharge, 0)} – {insp.symbol}{fmt(insp.max, 0)}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium mb-2" style={{ color: "#6E7C87" }}>Requirement</div>
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
                  {row.inspection}
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
                Inspection Fee
              </span>
            </div>
            <div className="ff-display text-3xl font-semibold" style={{ color: "#152634" }}>
              {row.inspection === "Required"
                ? `${insp.symbol}${fmt(inspectionFee ?? minCharge, 0)}`
                : "Not Required"}
            </div>
          </div>

          <p className="text-xs mt-4" style={{ color: "#8B978F" }}>
            Fee = 1% of Total Net Value, clamped between the min and max charge above. Ethiopia uses a
            higher minimum ({INSPECTION.USD.symbol}{INSPECTION.USD.minEthiopia} / {INSPECTION.EUR.symbol}
            {INSPECTION.EUR.minEthiopia}). Fees apply once net value exceeds $2,000 — except Tanzania, where
            the threshold is $5,000.
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
            <li>Above rate is only an estimate to be used for quoting purposes only.</li>
            <li>Calculation is subject to rate of exchange and will be updated should extreme changes in ROE occur.</li>
            <li>Rates exclude any additional costs required for extra length or height restrictions by the airline, above the norm.</li>
            <li>Additional costs may apply in case of space availability on cargo planes where goods are bumped onto other flights, causing delays.</li>
            <li>If the gross weight is inaccurate due to large dimensions, the volume of the goods will be used instead.</li>
            <li>Actual airfreight costs will be invoiced once made available by the forwarder against a packing list.</li>
            <li>Grundfos cannot be held liable for any unforeseen costs additional to the calculated rates.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
