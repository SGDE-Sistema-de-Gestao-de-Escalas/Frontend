import React from "react";
import { useSchool } from "../../context/SchoolContext";

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
      <select
        value={hVal}
        disabled={disabled}
        onChange={(e) => setHour(Number(e.target.value))}
        className="flex-1 px-2.5 py-2 text-sm rounded-lg border border-border bg-input-background font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
      >
        {hours.map((h) => (
          <option key={h} value={h}>
            {String(h).padStart(2, "0")}h
          </option>
        ))}
      </select>
      <span className="text-muted-foreground text-sm font-mono font-bold">:</span>
      <select
        value={mVal}
        disabled={disabled}
        onChange={(e) => setMinute(Number(e.target.value))}
        className="flex-1 px-2.5 py-2 text-sm rounded-lg border border-border bg-input-background font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
      >
        {minutes.map((m) => (
          <option key={m} value={m}>
            {String(m).padStart(2, "0")}
          </option>
        ))}
      </select>
    </div>
  );
}
