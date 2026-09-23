import React, { useState } from "react";
import { ChevronRight, UserPlus, Users } from "lucide-react";
import { assistants as ASSISTANTS } from "../../api/mockData";
import { Card } from "../ui/card";

interface AssistantsListPageProps {
  onAddNew: () => void;
  onViewProfile: (id?: number) => void;
}

export default function AssistantsListPage({
  onAddNew,
  onViewProfile,
}: AssistantsListPageProps) {
  const [tab, setTab] = useState<"ativos" | "inativos">("ativos");
  const active = ASSISTANTS.filter((a) => a.id !== 2);
  const inactive = ASSISTANTS.filter((a) => a.id === 2);
  const list = tab === "ativos" ? active : inactive;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Equipa de Assistentes
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {ASSISTANTS.length} assistentes registados no agrupamento
          </p>
        </div>
        <button
          type="button"
          onClick={onAddNew}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-xs"
        >
          <UserPlus size={14} />
          Adicionar Assistente
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-px border-b border-border">
        {(
          [
            {
              id: "ativos" as const,
              label: "Ativos",
              count: active.length,
              color: "bg-[#0E7C59]",
            },
            {
              id: "inativos" as const,
              label: "Inativos / Em Licença",
              count: inactive.length,
              color: "bg-muted-foreground",
            },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${t.color}`} />
            {t.label}
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                tab === t.id
                  ? "bg-primary/10 text-primary font-bold"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Users size={32} className="mb-3 opacity-30" />
          <p className="text-sm">Nenhum assistente nesta categoria</p>
        </div>
      ) : (
        <Card className="overflow-hidden border-border bg-card">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_2fr_1fr_auto] gap-4 px-4 py-2.5 border-b border-border bg-muted/20">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Nome
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide hidden sm:block">
              Observação / Exceção
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide hidden sm:block">
              Estado
            </span>
            <span />
          </div>
          {list.map((a, i) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onViewProfile(a.id)}
              className={`w-full grid grid-cols-[2fr_2fr_1fr_auto] gap-4 px-4 py-3 items-center text-left transition-colors hover:bg-muted/40 group ${
                i !== list.length - 1 ? "border-b border-border/50" : ""
              } ${tab === "inativos" ? "opacity-60 hover:opacity-90" : ""}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    tab === "ativos" ? "bg-primary/10" : "bg-muted"
                  }`}
                >
                  <span
                    className={`text-xs font-bold font-mono ${
                      tab === "ativos"
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {a.initials}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate block">
                    {a.name}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {a.mecanografico}
                  </span>
                </div>
              </div>
              <span className="text-sm text-muted-foreground hidden sm:block truncate">
                {a.exception ?? "—"}
              </span>
              <span className="hidden sm:flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    tab === "ativos" ? "bg-[#0E7C59]" : "bg-muted-foreground"
                  }`}
                />
                <span className="text-xs text-muted-foreground">
                  {tab === "ativos" ? "Ativo" : "Inativo"}
                </span>
              </span>
              <ChevronRight
                size={14}
                className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              />
            </button>
          ))}
        </Card>
      )}
    </div>
  );
}

