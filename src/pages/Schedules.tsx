import { assistants } from "../api/mockData";

export default function Schedules() {
  return (
    <section className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-foreground">Escalas</h1><p className="text-sm text-muted-foreground">A matriz de horários será alimentada pela API Laravel.</p></div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {assistants.slice(0, 5).map((assistant) => <div key={assistant.id} className="flex items-center justify-between border-b border-border p-4 last:border-0"><span className="text-sm font-medium text-foreground">{assistant.name}</span><span className="text-xs text-muted-foreground">{assistant.mecanografico}</span></div>)}
      </div>
    </section>
  );
}
