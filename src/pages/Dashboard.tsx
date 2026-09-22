import { assistants, schools } from "../api/mockData";

export default function Dashboard() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumo operacional do agrupamento.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Assistentes</p><p className="mt-2 text-3xl font-semibold text-foreground">{assistants.length}</p></div>
        <div className="rounded-lg border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Escolas ativas</p><p className="mt-2 text-3xl font-semibold text-foreground">{schools.filter((school) => school.active).length}</p></div>
      </div>
    </section>
  );
}
