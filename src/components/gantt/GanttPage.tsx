import React, { useState } from "react";

export default function GanttPage() {
  const [tooltip, setTooltip] = useState<{
    task: {
      name: string;
      phaseName: string;
      phaseColor: string;
      start: number;
      end: number;
      members: number[];
    };
    x: number;
    y: number;
  } | null>(null);

  // Sep 14 → Nov 15 = 62 days
  const TOTAL_DAYS = 62;
  const START_DATE = new Date(2026, 8, 14);

  const TEAM = [
    {
      id: 1,
      name: "Pedro Costa",
      initials: "PC",
      color: "#6366F1",
      role: "Full-stack / Laravel Lead",
    },
    {
      id: 2,
      name: "Bruno Silva",
      initials: "BS",
      color: "#EC4899",
      role: "Full-stack / React Lead",
    },
    {
      id: 3,
      name: "Nuno Alves",
      initials: "NA",
      color: "#06B6D4",
      role: "Backend Developer",
    },
    {
      id: 4,
      name: "Jorge Nunes",
      initials: "JN",
      color: "#F59E0B",
      role: "Frontend Developer",
    },
  ];

  type Task = { name: string; start: number; end: number; members: number[] };
  type Phase = { id: string; name: string; color: string; tasks: Task[] };

  const PHASES: Phase[] = [
    {
      id: "infra",
      name: "Setup & Infraestrutura",
      color: "#6366F1",
      tasks: [
        {
          name: "Configuração de ambientes (dev/staging/prod)",
          start: 0,
          end: 4,
          members: [1, 2, 3, 4],
        },
        {
          name: "Schema BD & Modelação de dados",
          start: 0,
          end: 7,
          members: [1, 3],
        },
        {
          name: "CI/CD Pipeline & deploy automático",
          start: 3,
          end: 7,
          members: [1, 2],
        },
      ],
    },
    {
      id: "auth",
      name: "Autenticação & Utilizadores",
      color: "#A855F7",
      tasks: [
        {
          name: "API: Auth JWT + Roles & Permissões",
          start: 5,
          end: 14,
          members: [1, 3],
        },
        {
          name: "UI: Login, Recuperar Password",
          start: 5,
          end: 11,
          members: [2, 4],
        },
        {
          name: "API: CRUD Utilizadores + Perfis",
          start: 10,
          end: 18,
          members: [3],
        },
        {
          name: "UI: Perfil & Configurações de Conta",
          start: 11,
          end: 18,
          members: [4],
        },
      ],
    },
    {
      id: "entities",
      name: "Escolas & Assistentes",
      color: "#06B6D4",
      tasks: [
        {
          name: "API: CRUD Escolas",
          start: 7,
          end: 17,
          members: [3],
        },
        {
          name: "UI: Gestão de Escolas",
          start: 14,
          end: 24,
          members: [4],
        },
        {
          name: "API: CRUD Assistentes + Exceções",
          start: 10,
          end: 24,
          members: [1],
        },
        {
          name: "UI: Listagem & Formulário de Assistentes",
          start: 17,
          end: 28,
          members: [2],
        },
      ],
    },
    {
      id: "motor",
      name: "Motor de Regras",
      color: "#F59E0B",
      tasks: [
        {
          name: "API: Regras de Horário + Vigências",
          start: 17,
          end: 28,
          members: [1, 3],
        },
        {
          name: "UI: ConfigEngine (formulários de regras)",
          start: 21,
          end: 35,
          members: [2, 4],
        },
        {
          name: "Algoritmo de geração de escalas",
          start: 24,
          end: 36,
          members: [1],
        },
      ],
    },
    {
      id: "mapa",
      name: "Mapa de Escalas",
      color: "#00B884",
      tasks: [
        {
          name: "API: Endpoints mapa (dia / semana / mês)",
          start: 28,
          end: 38,
          members: [1, 3],
        },
        {
          name: "UI: Vistas Dia / Semana / Mês",
          start: 28,
          end: 42,
          members: [2, 4],
        },
        {
          name: "UI: Edição de blocos (drag & click)",
          start: 35,
          end: 46,
          members: [2],
        },
        {
          name: "API: Validações & deteção de sobreposições",
          start: 38,
          end: 46,
          members: [1],
        },
      ],
    },
    {
      id: "ausencias",
      name: "Ausências & Transferências",
      color: "#EC4899",
      tasks: [
        {
          name: "API: Gestão de Ausências",
          start: 35,
          end: 46,
          members: [3],
        },
        {
          name: "API: Sistema de Transferências",
          start: 38,
          end: 49,
          members: [1],
        },
        {
          name: "UI: Ausências & calendário de faltas",
          start: 42,
          end: 53,
          members: [4],
        },
        {
          name: "UI: Pedidos de Transferência",
          start: 46,
          end: 53,
          members: [2],
        },
      ],
    },
    {
      id: "reports",
      name: "Relatórios & Exportação",
      color: "#10B981",
      tasks: [
        {
          name: "API: Relatórios + exportação PDF / Excel",
          start: 46,
          end: 56,
          members: [1, 3],
        },
        {
          name: "UI: Página Relatórios + filtros",
          start: 49,
          end: 58,
          members: [2, 4],
        },
      ],
    },
    {
      id: "qa",
      name: "QA & Testes",
      color: "#EF4444",
      tasks: [
        {
          name: "Testes funcionais & E2E",
          start: 49,
          end: 58,
          members: [2, 4],
        },
        {
          name: "Correção de bugs & estabilização",
          start: 53,
          end: 60,
          members: [1, 2, 3, 4],
        },
      ],
    },
    {
      id: "deploy",
      name: "Deploy & Entrega",
      color: "#8B5CF6",
      tasks: [
        {
          name: "Deploy staging + testes UAT",
          start: 58,
          end: 61,
          members: [1, 2, 3, 4],
        },
        {
          name: "Go-live produção",
          start: 61,
          end: 62,
          members: [1],
        },
      ],
    },
  ];

  // Week tick marks
  const weeks: { day: number; label: string }[] = [];
  for (let d = 0; d <= TOTAL_DAYS; d += 7) {
    const dt = new Date(START_DATE);
    dt.setDate(dt.getDate() + d);
    const day = dt.getDate();
    const mon = dt
      .toLocaleDateString("pt-PT", { month: "short" })
      .replace(".", "");
    weeks.push({ day: d, label: `${day} ${mon}` });
  }

  const xPct = (d: number) => `${(d / TOTAL_DAYS) * 100}%`;
  const wPct = (s: number, e: number) => `${((e - s) / TOTAL_DAYS) * 100}%`;

  // Total sprint count per team member
  const memberStats = TEAM.map((m) => {
    const tasks = PHASES.flatMap((p) =>
      p.tasks.filter((t) => t.members.includes(m.id))
    );
    const phases = new Set(
      PHASES.filter((p) =>
        p.tasks.some((t) => t.members.includes(m.id))
      ).map((p) => p.id)
    );
    return { ...m, taskCount: tasks.length, phaseCount: phases.size };
  });

  return (
    <div className="space-y-5 min-w-0">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Mapa de Gantt — SGDE
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            4 pessoas · 14 Set → 15 Nov 2026 · 9 sprints quinzenais
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {TEAM.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-1.5 bg-card border border-border rounded-full px-2.5 py-1"
            >
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: m.color }}
              >
                {m.initials}
              </div>
              <span className="text-xs text-muted-foreground">
                {m.name.split(" ")[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart card */}
      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <div style={{ minWidth: 780 }}>
          {/* Column header */}
          <div className="flex border-b border-border bg-muted/30 sticky top-0 z-10">
            <div className="w-60 flex-shrink-0 px-4 py-2.5 border-r border-border/50">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Fase / Tarefa
              </span>
            </div>
            <div className="flex-1 relative px-2 py-2">
              {weeks.map((w) => (
                <div
                  key={w.day}
                  className="absolute top-0 flex flex-col items-start h-full"
                  style={{ left: xPct(w.day) }}
                >
                  <span className="text-[9px] font-medium text-muted-foreground/70 pl-1 pt-1.5">
                    {w.label}
                  </span>
                  <div className="flex-1 w-px bg-border/30 mt-1 ml-1" />
                </div>
              ))}
              {/* Today marker header */}
              <div
                className="absolute top-0 bottom-0 flex flex-col items-center z-20"
                style={{ left: xPct(0) }}
              >
                <span className="text-[9px] font-bold text-destructive bg-destructive/10 rounded px-1 mt-1">
                  Hoje
                </span>
                <div className="flex-1 w-0.5 bg-destructive/60 mt-0.5" />
              </div>
            </div>
          </div>

          {/* Phase rows */}
          {PHASES.map((phase) => {
            const phaseStart = Math.min(...phase.tasks.map((t) => t.start));
            const phaseEnd = Math.max(...phase.tasks.map((t) => t.end));
            return (
              <div key={phase.id}>
                {/* Phase header row */}
                <div
                  className="flex border-b border-border/40"
                  style={{ backgroundColor: phase.color + "0C" }}
                >
                  <div className="w-60 flex-shrink-0 px-4 py-2 border-r border-border/50 flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: phase.color }}
                    />
                    <span className="text-[11px] font-semibold text-foreground">
                      {phase.name}
                    </span>
                  </div>
                  <div className="flex-1 relative px-2">
                    {/* Phase span background */}
                    <div
                      className="absolute inset-y-1.5 rounded"
                      style={{
                        left: xPct(phaseStart),
                        width: wPct(phaseStart, phaseEnd),
                        backgroundColor: phase.color + "22",
                        border: `1px dashed ${phase.color}50`,
                      }}
                    />
                    {/* Today marker */}
                    <div
                      className="absolute inset-y-0 w-0.5 bg-destructive/40 z-10"
                      style={{ left: xPct(0) }}
                    />
                  </div>
                </div>

                {/* Task rows */}
                {phase.tasks.map((task, ti) => (
                  <div
                    key={ti}
                    className="flex border-b border-border/20 hover:bg-muted/20 transition-colors group"
                  >
                    <div className="w-60 flex-shrink-0 px-4 pl-8 py-1.5 border-r border-border/30 flex items-center">
                      <span
                        className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors truncate leading-tight"
                        title={task.name}
                      >
                        {task.name}
                      </span>
                    </div>
                    <div
                      className="flex-1 relative px-2 py-1"
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {/* Week grid lines */}
                      {weeks.map((w) => (
                        <div
                          key={w.day}
                          className="absolute inset-y-0 w-px bg-border/20"
                          style={{ left: xPct(w.day) }}
                        />
                      ))}
                      {/* Today marker */}
                      <div
                        className="absolute inset-y-0 w-0.5 bg-destructive/40 z-10"
                        style={{ left: xPct(0) }}
                      />
                      {/* Task bar */}
                      <div
                        className="absolute inset-y-1 rounded-md cursor-pointer flex items-center px-1.5 gap-0.5 overflow-hidden transition-opacity hover:opacity-80"
                        style={{
                          left: xPct(task.start),
                          width: wPct(task.start, task.end),
                          backgroundColor: phase.color,
                        }}
                        onMouseEnter={(e) => {
                          const r = (
                            e.currentTarget as HTMLElement
                          ).getBoundingClientRect();
                          setTooltip({
                            task: {
                              ...task,
                              phaseName: phase.name,
                              phaseColor: phase.color,
                            },
                            x: r.left,
                            y: r.top,
                          });
                        }}
                      >
                        {task.members.map((mid) => {
                          const m = TEAM.find((t) => t.id === mid)!;
                          return (
                            <div
                              key={mid}
                              className="w-3.5 h-3.5 rounded-full border border-white/40 flex-shrink-0 flex items-center justify-center text-[7px] font-bold text-white"
                              style={{ backgroundColor: m.color }}
                              title={m.name}
                            >
                              {m.initials[0]}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          {/* Sprint footer */}
          <div className="flex border-t border-border bg-muted/20">
            <div className="w-60 flex-shrink-0 px-4 py-2 border-r border-border/50">
              <span className="text-[10px] text-muted-foreground">
                62 dias · 9 fases
              </span>
            </div>
            <div className="flex-1 relative px-2 py-1.5">
              {[0, 14, 28, 42, 56].map((d, i) =>
                d < TOTAL_DAYS ? (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 flex items-center"
                    style={{
                      left: xPct(d),
                      width: wPct(d, Math.min(d + 14, TOTAL_DAYS)),
                    }}
                  >
                    <span className="text-[9px] text-muted-foreground/50 pl-2">
                      Sprint {i + 1}
                    </span>
                  </div>
                ) : null
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Team summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {memberStats.map((m) => (
          <div
            key={m.id}
            className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3"
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: m.color }}
              >
                {m.initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {m.name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {m.role}
                </p>
              </div>
            </div>
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-2xl font-bold font-mono text-foreground">
                  {m.taskCount}
                </p>
                <p className="text-[10px] text-muted-foreground">tarefas</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold font-mono text-foreground">
                  {m.phaseCount}
                </p>
                <p className="text-[10px] text-muted-foreground">fases</p>
              </div>
            </div>
            {/* Mini color bar per phase */}
            <div className="flex gap-0.5 h-1.5">
              {PHASES.filter((p) =>
                p.tasks.some((t) => t.members.includes(m.id))
              ).map((p) => (
                <div
                  key={p.id}
                  className="flex-1 rounded-full"
                  style={{ backgroundColor: p.color }}
                  title={p.name}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Fases do projeto
        </p>
        <div className="flex flex-wrap gap-3">
          {PHASES.map((p) => (
            <div key={p.id} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: p.color }}
              />
              <span className="text-xs text-muted-foreground">{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip portal */}
      {tooltip && (
        <div
          className="fixed z-50 bg-popover border border-border rounded-xl shadow-xl p-3.5 pointer-events-none"
          style={{
            top: tooltip.y - 8,
            left: tooltip.x + 12,
            transform: "translateY(-100%)",
            maxWidth: 280,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: tooltip.task.phaseColor }}
            />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              {tooltip.task.phaseName}
            </p>
          </div>
          <p className="text-xs font-semibold text-foreground mb-2 leading-tight">
            {tooltip.task.name}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {tooltip.task.members.map((mid) => {
              const m = TEAM.find((t) => t.id === mid)!;
              return (
                <div
                  key={mid}
                  className="flex items-center gap-1 bg-muted/50 rounded-full px-1.5 py-0.5"
                >
                  <div
                    className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                    style={{ backgroundColor: m.color }}
                  >
                    {m.initials[0]}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {m.name.split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Dia {tooltip.task.start + 1} → {tooltip.task.end} ·{" "}
            {tooltip.task.end - tooltip.task.start} dias
          </p>
        </div>
      )}
    </div>
  );
}

