import { assistants } from "../api/mockData";

export default function Assistants() {
  return <section><h1 className="text-2xl font-semibold text-foreground">Assistentes</h1><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{assistants.map((assistant) => <div key={assistant.id} className="rounded-lg border border-border bg-card p-4"><p className="font-medium text-foreground">{assistant.name}</p><p className="text-xs text-muted-foreground">{assistant.mecanografico}</p></div>)}</div></section>;
}
