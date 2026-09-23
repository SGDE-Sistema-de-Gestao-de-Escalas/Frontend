import React from "react";

const OPERATING_START = 6; // 06:00
const OPERATING_END = 21; // 21:00
const QUARTER_MINUTES = [0, 15, 30, 45];

interface TimePickerProps {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  operatingStart?: number;
  operatingEnd?: number;
}

export default function TimePicker({
  value,
  onChange,
  className = "",
  operatingStart = OPERATING_START,
  operatingEnd = OPERATING_END,
}: TimePickerProps) {
  const parts = value ? value.split(":") : ["06", "00"];
  const hVal = parseInt(parts[0]) || operatingStart;
  const mVal = parseInt(parts[1]) || 0;

  const hours = Array.from(
    { length: operatingEnd - operatingStart + 1 },
    (_, i) => operatingStart + i
  );
  const validMinutes = hVal === operatingEnd ? [0] : QUARTER_MINUTES;

  function setHour(h: number) {
    const clampedMin =
      h === operatingEnd ? 0 : QUARTER_MINUTES.includes(mVal) ? mVal : 0;
    onChange(
      `${String(h).padStart(2, "0")}:${String(clampedMin).padStart(2, "0")}`
    );
  }

  function setMinute(m: number) {
    onChange(`${String(hVal).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <select
        value={hVal}
        onChange={(e) => setHour(Number(e.target.value))}
        className="flex-1 px-2 py-2 text-sm rounded-lg border border-border bg-input-background font-mono focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {hours.map((h) => (
          <option key={h} value={h}>
            {String(h).padStart(2, "0")}h
          </option>
        ))}
      </select>
      <span className="text-muted-foreground text-sm font-mono">:</span>
      <select
        value={mVal}
        onChange={(e) => setMinute(Number(e.target.value))}
        className="flex-1 px-2 py-2 text-sm rounded-lg border border-border bg-input-background font-mono focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {validMinutes.map((m) => (
          <option key={m} value={m}>
            {String(m).padStart(2, "0")}
          </option>
        ))}
      </select>
    </div>
  );
}

