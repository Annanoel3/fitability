import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function StepBasicInfo({ data, onChange }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-heading font-bold text-foreground">Let's get to know you</h2>
        <p className="text-muted-foreground mt-2">This helps us create a safe, personalized plan just for you.</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-base font-medium">What should we call you?</Label>
          <Input
            value={data.display_name || ""}
            onChange={e => onChange({ display_name: e.target.value })}
            placeholder="Your name"
            className="mt-2 h-12 text-lg"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-base font-medium">Age</Label>
            <Input
              type="number"
              value={data.age || ""}
              onChange={e => onChange({ age: parseInt(e.target.value) || "" })}
              placeholder="Age"
              className="mt-2 h-12 text-lg"
            />
          </div>
          <div>
            <Label className="text-base font-medium">Sex</Label>
            <Select value={data.sex || ""} onValueChange={v => onChange({ sex: v })}>
              <SelectTrigger className="mt-2 h-12 text-lg">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {["Male", "Female", "Non-binary", "Prefer not to say"].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-base font-medium">Height</Label>
            <div className="flex gap-2 mt-2">
              <Input
                type="number"
                value={data.height_ft || ""}
                onChange={e => onChange({ height_ft: parseInt(e.target.value) || "" })}
                placeholder="Feet"
                className="h-12 text-lg"
              />
              <Input
                type="number"
                value={data.height_in || ""}
                onChange={e => onChange({ height_in: parseInt(e.target.value) || "" })}
                placeholder="Inches"
                className="h-12 text-lg"
              />
            </div>
          </div>
          <div>
            <Label className="text-base font-medium">Weight (lbs)</Label>
            <Input
              type="number"
              value={data.weight_lbs || ""}
              onChange={e => onChange({ weight_lbs: parseInt(e.target.value) || "" })}
              placeholder="Weight"
              className="mt-2 h-12 text-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
}