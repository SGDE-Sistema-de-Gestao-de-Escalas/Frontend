import { absences } from "../api/mockData";

export default function Absences() {
  return <section><h1 className="text-2xl font-semibold text-foreground">Ausências</h1><div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">{absences.map((absence) => <div key={absence.id} className="flex items-center justify-between border-b border-border p-4 last:border-0"><div><p className="font-medium text-foreground">{absence.assistant}</p><p className="text-xs text-muted-foreground">{absence.start} — {absence.end}</p></div><span className="text-xs capitalize text-muted-foreground">{absence.status}</span></div>)}</div></section>;
}
