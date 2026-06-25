import React, { useState, useRef } from "react";
import { Shield, Check, ChevronDown, ChevronUp } from "lucide-react";

const VETERAN_ORGS = [
  { id: "wwp", name: "Wounded Warrior Project (WWP)" },
  { id: "dav", name: "Disabled American Veterans (DAV)" },
  { id: "vfw", name: "Veterans of Foreign Wars (VFW)" },
  { id: "amvets", name: "AMVETS" },
  { id: "al", name: "American Legion" },
  { id: "pva", name: "Paralyzed Veterans of America (PVA)" },
  { id: "iava", name: "Iraq & Afghanistan Veterans of America (IAVA)" },
  { id: "mvaa", name: "Military Veterans Advocacy" },
  { id: "vso", name: "Veterans Service Organization (other)" },
];

export default function StepVeteran({ data, onChange }) {
  const isVet = data.is_veteran;
  const details = data.veteran_details || {};
  const selectedOrgs = details.organizations || [];
  const [showOrgs, setShowOrgs] = useState(false);
  const orgsRef = useRef(null);

  const toggleOrg = (id) => {
    const next = selectedOrgs.includes(id)
      ? selectedOrgs.filter(o => o !== id)
      : [...selectedOrgs, id];
    onChange({ veteran_details: { ...details, organizations: next } });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-heading font-bold text-foreground">Are you a veteran?</h2>
        <p className="text-muted-foreground mt-2">Veterans receive free access to FitAbility — no payment required, ever.</p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => onChange({ is_veteran: true })}
          className={`flex-1 p-6 rounded-xl border-2 text-center transition-all ${
            isVet === true ? "border-primary bg-secondary" : "border-border bg-card hover:border-primary/30"
          }`}
        >
          <Shield className="w-8 h-8 mx-auto mb-2 text-primary" />
          <div className="font-semibold">Yes, I served</div>
        </button>
        <button
          onClick={() => onChange({ is_veteran: false, veteran_details: {} })}
          className={`flex-1 p-6 rounded-xl border-2 text-center transition-all ${
            isVet === false ? "border-primary bg-secondary" : "border-border bg-card hover:border-primary/30"
          }`}
        >
          <div className="text-3xl mb-2">👤</div>
          <div className="font-semibold">No</div>
        </button>
      </div>

      {isVet === true && (
        <div className="space-y-4 mt-2 p-5 bg-secondary/40 rounded-xl border border-primary/20">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
            <Shield className="w-4 h-4" /> Thank you for your service 🇺🇸
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              You have <strong>free lifetime access</strong> to FitAbility.
            </p>
            <p className="text-sm text-muted-foreground">
              Plus, you'll see <strong>significantly fewer ads</strong> — one every few uses instead of daily.
            </p>
          </div>

          {/* Organizations — optional */}
          <button
            onClick={() => {
              setShowOrgs(v => {
                if (!v) setTimeout(() => orgsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                return !v;
              });
            }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-sm font-medium"
          >
            <span>
              Veteran organizations{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
              {selectedOrgs.length > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                  {selectedOrgs.length}
                </span>
              )}
            </span>
            {showOrgs ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {showOrgs && (
            <div ref={orgsRef} className="grid grid-cols-1 gap-2">
              {VETERAN_ORGS.map(org => {
                const active = selectedOrgs.includes(org.id);
                return (
                  <button
                    key={org.id}
                    onClick={() => toggleOrg(org.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                      active ? "border-primary bg-secondary" : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                      active ? "bg-primary text-primary-foreground" : "border border-muted-foreground/30"
                    }`}>
                      {active && <Check className="w-3 h-3" />}
                    </div>
                    <span className="text-sm font-medium">{org.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {isVet === false && (
        <p className="text-center text-sm text-muted-foreground">
          No problem — let's continue setting up your personalized plan.
        </p>
      )}
    </div>
  );
}