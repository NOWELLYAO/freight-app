import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Landmark, Percent, CreditCard, Info } from "lucide-react";
import {
  TEC_DD_RATES,
  CI_RATES,
  MODE_MAJORATIONS,
  fmt,
  loadFreightBridge,
  FreightBridge,
} from "../data";

export default function PrixRevientPage() {
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

  const [bridge, setBridge] = useState<FreightBridge | null>(null);
  React.useEffect(() => {
    setBridge(loadFreightBridge());
  }, []);

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

  // ---- Prix de Revient Côte d'Ivoire — multi-articles ----
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
    if (bridge) setCiFret(bridge.totalEur.toFixed(2));
  };

  return (
    <div>
      {/* ---------------- PAGE TITLE ---------------- */}
      <h1 className="ff-display text-4xl sm:text-5xl font-semibold leading-tight mb-2">
        Prix de Revient — Côte d'Ivoire
      </h1>
      <p className="text-base max-w-xl mb-1" style={{ color: "#5B6A75" }}>
        Valeur en douane, droits et taxes du TEC, et prix de vente — pour une
        commande à un ou plusieurs articles.
      </p>
      {bridge && (
        <p className="text-xs mb-6 flex items-center gap-1.5" style={{ color: "#8B978F" }}>
          <Info size={12} />
          Fret disponible depuis la page Fret : {fmt(bridge.totalEur, 2)} € ({bridge.departure} →{" "}
          {bridge.airport}). Utilisez le bouton « Reprendre le fret » ci-dessous.
        </p>
      )}
      {!bridge && (
        <p className="text-xs mb-6">
          <Link to="/" className="font-medium" style={{ color: "#3D5A73" }}>
            ← Calculez d'abord un fret sur la page principale
          </Link>{" "}
          <span style={{ color: "#8B978F" }}>pour le reprendre automatiquement ici.</span>
        </p>
      )}

        {/* ---------------- PRIX DE REVIENT CÔTE D'IVOIRE ---------------- */}
        <div className="mt-8 rounded-2xl overflow-hidden" style={{ background: "#152634" }}>
          <div className="px-6 pt-5 pb-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Landmark size={16} color="#E8A33D" />
              <h2 className="ff-display text-sm font-semibold uppercase tracking-wide" style={{ color: "#F5F2EA" }}>
                Prix de Revient — Importation Côte d'Ivoire
              </h2>
            </div>
            {bridge?.country === "Côte d'Ivoire" && (
              <span
                className="ff-mono text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: "#E8A33D", color: "#152634", fontWeight: 600 }}
              >
                FRET CALCULÉ VERS LA CÔTE D'IVOIRE
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

    </div>
  );
}
