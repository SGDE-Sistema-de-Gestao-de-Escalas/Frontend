import React from "react";
import { useSchool } from "../../context/SchoolContext";
import CustomSelect from "./CustomSelect";

const QUARTER_MINUTES = [0, 15, 30, 45];

interface TimePickerProps {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  operatingStart?: number;
  operatingEnd?: number;
  unrestricted?: boolean;
  disabled?: boolean;
}

export default function TimePicker({
  value,
  onChange,
  className = "",
  operatingStart,
  operatingEnd,
  unrestricted = false,
  disabled = false,
}: TimePickerProps) {
  let contextStart = 7;
  let contextEnd = 21;

  try {
    const school = useSchool();
    if (school?.operatingHours) {
      contextStart = school.operatingHours.startHour;
      contextEnd = school.operatingHours.endHour;
    }
  } catch {
    // Fallback if rendered outside SchoolProvider
  }

  const effectiveStart = unrestricted
    ? 0
    : operatingStart !== undefined
    ? operatingStart
    : contextStart;

  const effectiveEnd = unrestricted
    ? 23
    : operatingEnd !== undefined
    ? operatingEnd
    : contextEnd;

  const parts = value ? value.split(":") : ["07", "00"];
  let hVal = parseInt(parts[0], 10);
  if (isNaN(hVal)) hVal = effectiveStart;
  let mVal = parseInt(parts[1], 10);
  if (isNaN(mVal)) mVal = 0;

  // Build the list of available hours
  const hoursSet = new Set<number>();
  for (let i = effectiveStart; i <= effectiveEnd; i++) {
    hoursSet.add(i);
  }
  // Ensure the current value's hour is included even if slightly outside bounds
  hoursSet.add(hVal);
  const hours = Array.from(hoursSet).sort((a, b) => a - b);

  // Available minutes in 15-min intervals (00, 15, 30, 45)
  const minutesSet = new Set<number>(QUARTER_MINUTES);
  minutesSet.add(mVal);
  const minutes = Array.from(minutesSet).sort((a, b) => a - b);

  function setHour(h: number) {
    onChange(`${String(h).padStart(2, "0")}:${String(mVal).padStart(2, "0")}`);
  }

  function setMinute(m: number) {
    onChange(`${String(hVal).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <CustomSelect
        value={String(hVal)}
        disabled={disabled}
        onValueChange={(val) => setHour(Number(val))}
        className="flex-1"
        triggerClassName="font-mono text-sm py-2 px-2.5 rounded-lg border-border"
        options={hours.map((h) => ({
          value: String(h),
          label: `${String(h).padStart(2, "0")}h`,
        }))}
      />
      <span className="text-muted-foreground text-sm font-mono font-bold">:</span>
      <CustomSelect
        value={String(mVal)}
        disabled={disabled}
        onValueChange={(val) => setMinute(Number(val))}
        className="flex-1"
        triggerClassName="font-mono text-sm py-2 px-2.5 rounded-lg border-border"
        options={minutes.map((m) => ({
          value: String(m),
          label: String(m).padStart(2, "0"),
        }))}
      />
    </div>
  );
}
