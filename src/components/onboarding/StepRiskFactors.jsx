import React from "react";
import { RISK_FACTORS } from "@/lib/constants";
import { Check, AlertTriangle } from "lucide-react";

const SEVERITY_OPTIONS = [
  "A little — I manage it well",
  "Moderately — it limits some activity",
  "A lot — it limits me significantly",
];

export default function StepRiskFactors({ data, onChange }) {
  const selected = data.risk_factors || [];
  const details = data.risk_factor_details || {};
  const noRiskFactors = data.no_risk_factors || false;

  const toggle = (item) => {
    const isSel = selected.includes(item);
    const next = isSel ? selected.filter((r) => r !== item) : [...selected, item];
    const nextDetails = { ...details };
    if (isSel) {
      delete nextDetails[item];
    } else if (!nextDetails[item]) {
      nextDetails[item] = { severity: "", note: "" };
    }
    onChange({ risk_factors: next, risk_factor_details: nextDetails, no_risk_factors: false });
  };

  const toggleNoRiskFactors = () => {
    onChange({ risk_factors: [], risk_factor_details: {}, no_risk_factors: !noRiskFactors });
  };

  const setDetail = (item, field, value) => {
    onChange({
      risk_factor_details: {
        ...details,
        [item]: { ...(details[item] || { severity: "", note: "" }), [field]: value },
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-heading font-bold text-foreground">Risk Factors</h2>
        <p className="text-muted-foreground mt-2">Select any that apply, then rate how much each one affects you.</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-amber-800">
          This keeps you safe. We only leave out the specific moves that could be risky for you — everything else still scales to what you're capable of, and you can ask your Coach to adjust anytime.
        </p>
      </div>

      <button
        type="button"
        onClick={toggleNoRiskFactors}
        className={`w-full rounded-xl border transition-all p-4 text-left font-medium text-sm ${
          noRiskFactors
            ? "border-primary bg-primary/10 text-foreground"
            : "border-border bg-card hover:border-primary/30 text-foreground"
        }`}
      >
        ✓ None of these apply
      </button>

      <div className="space-y-3">
        {RISK_FACTORS.map((item) => {
          const active = selected.includes(item);
          const detail = details[item] || { severity: "", note: "" };
          return (
            <div key={item} className={"rounded-xl border transition-all " + (active ? "border-amber-400 bg-amber-50" : "border-border bg-card hover:border-primary/30")}>
              <button
                onClick={() => toggle(item)}
                className={"w-full flex items-center gap-3 p-4 text-left " + (active ? "text-amber-900" : "text-foreground")}
              >
                <div className={"w-5 h-5 rounded flex items-center justify-center flex-shrink-0 " + (active ? "bg-amber-500 text-white" : "border border-muted-foreground/30")}>
                  {active && <Check className="w-3 h-3" />}
                </div>
                <span className="font-medium text-sm">{item}</span>
              </button>

              {active && (
                <div className="px-4 pb-4 pl-12 space-y-2">
                  <select
                    value={detail.severity}
                    onChange={(e) => setDetail(item, "severity", e.target.value)}
                    className="w-full rounded-lg border border-amber-300 bg-white text-sm text-amber-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="">How much does this affect you?</option>
                    {SEVERITY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={detail.note}
                    onChange={(e) => setDetail(item, "note", e.target.value)}
                    placeholder="Optional: anything we should know? (e.g. managed, can still cycle 20 mi)"
                    className="w-full rounded-lg border border-amber-300 bg-white text-sm text-amber-900 px-3 py-2 placeholder:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}