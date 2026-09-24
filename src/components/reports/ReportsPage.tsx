import React from "react";
import {
  AlertCircle,
  AlertTriangle,
  Download,
  Inbox,
  UserX,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  REPORTS_COVERAGE,
  REPORTS_ALERTS,
  REPORTS_ABSENCE_TYPES,
  REPORTS_ABSENCES,
  assistants as ASSISTANTS,
} from "../../api/mockData";

export default function ReportsPage() {
  const totalAbsenceDays = REPORTS_ABSENCES.reduce((s, r) => s + r.days, 0);
  const pendingCount = REPORTS_ABSENCES.filter(
    (r) => r.status === "pending"
  ).length;
  const coverageAlerts = REPORTS_ALERTS.reduce((s, r) => s + r.alerts, 0);
  const activeExceptions = ASSISTANTS.filter(
    (a) => a.exception !== null
  ).length;

  const kpis = [
    {
      label: "Alertas de Cobertura",
      value: String(coverageAlerts),
      sub: "acumulado 5 meses",
      icon: <AlertCircle size={16} />,
      variant: "danger" as const,
    },
    {
      label: "Ausências Pendentes",
      value: String(pendingCount),
      sub: "aguardam aprovação",
      icon: <Inbox size={16} />,
      variant: pendingCount > 0 ? ("warning" as const) : ("success" as const),
    },
    {
      label: "Dias Ausentes — Jan",
      value: String(totalAbsenceDays),
      sub: `${
        REPORTS_ABSENCES.filter((r) => r.days > 0).length
      } assistentes afetados`,
      icon: <UserX size={16} />,
      variant: "muted" as const,
    },
    {
      label: "Exceções Activas",
      value: String(activeExceptions),
      sub: "horários especiais",
      icon: <AlertTriangle size={16} />,
      variant:
        activeExceptions > 2 ? ("warning" as const) : ("success" as const),
    },
  ];

  const variantStyles = {
    danger: {
      bg: "bg-destructive/10",
      text: "text-destructive",
      icon: "text-destructive",
    },
    warning: {
      bg: "bg-[#D97706]/10",
      text: "text-[#D97706]",
      icon: "text-[#D97706]",
    },
    success: {
      bg: "bg-[#0E7C59]/10",
      text: "text-[#0E7C59]",
      icon: "text-[#0E7C59]",
    },
    muted: {
      bg: "bg-muted",
      text: "text-muted-foreground",
      icon: "text-muted-foreground",
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Relatórios</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cobertura, absentismo e exceções — Janeiro 2026
          </p>
        </div>
        <button
          type="button"
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
        >
          <Download size={13} />
          Exportar PDF
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => {
          const s = variantStyles[k.variant];
          return (
            <Card key={k.label} className="p-4">
              <div
                className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-3 ${s.icon}`}
              >
                {k.icon}
              </div>
              <p className="text-2xl font-semibold font-mono text-foreground">
                {k.value}
              </p>
              <p className="text-xs font-medium text-foreground mt-0.5">
                {k.label}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {k.sub}
              </p>
            </Card>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Coverage vs minimum this week */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-0.5">
            Cobertura Diária vs Mínimo
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Semana de 27 Jan — vermelho indica incumprimento
          </p>
          <div style={{ height: 190 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={REPORTS_COVERAGE}
                barGap={4}
                barCategoryGap="30%"
              >
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: "#5A6478" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#5A6478" }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 13]}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 8,
                    border: "1px solid #E8EBF2",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                  formatter={(v: any, name: any) => [
                    v,
                    name === "present" ? "Presentes" : "Mínimo",
                  ]}
                />
                <Bar
                  key="bar-present"
                  dataKey="present"
                  radius={[4, 4, 0, 0]}
                  name="present"
                >
                  {REPORTS_COVERAGE.map((e, i) => (
                    <Cell
                      key={`cov-${i}`}
                      fill={e.present < e.min ? "#C8291A" : "#1A56DB"}
                    />
                  ))}
                </Bar>
                <Bar
                  key="bar-min"
                  dataKey="min"
                  fill="#E8EBF2"
                  radius={[4, 4, 0, 0]}
                  name="min"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Coverage alerts per month */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-0.5">
            Alertas de Cobertura Insuficiente
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Número de incumprimentos detectados por mês
          </p>
          <div style={{ height: 190 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REPORTS_ALERTS} barCategoryGap="40%">
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "#5A6478" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#5A6478" }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 8]}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 8,
                    border: "1px solid #E8EBF2",
                  }}
                  formatter={(v: any) => [v, "Alertas"]}
                />
                <Bar key="bar-alerts" dataKey="alerts" radius={[4, 4, 0, 0]}>
                  {REPORTS_ALERTS.map((e, i) => (
                    <Cell
                      key={`alert-${i}`}
                      fill={
                        e.alerts >= 5
                          ? "#C8291A"
                          : e.alerts >= 3
                          ? "#D97706"
                          : "#1A56DB"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-3">
            {[
              { color: "#C8291A", label: "Crítico (≥5)" },
              { color: "#D97706", label: "Atenção (3–4)" },
              { color: "#1A56DB", label: "Normal (<3)" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: l.color }}
                />
                <span className="text-[10px] text-muted-foreground">
                  {l.label}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Absence types + table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Absence by type */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-0.5">
            Ausências por Tipo
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Total de dias — Jan 2026
          </p>
          <div style={{ height: 160 }} className="mb-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  key="pie-types"
                  data={REPORTS_ABSENCE_TYPES}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                >
                  {REPORTS_ABSENCE_TYPES.map((e, i) => (
                    <Cell key={`type-${i}`} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 8,
                    border: "1px solid #E8EBF2",
                  }}
                  formatter={(v: any, name: any) => [`${v} dias`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5">
            {REPORTS_ABSENCE_TYPES.map((t) => (
              <div key={t.type} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="text-xs text-muted-foreground">{t.type}</span>
                </div>
                <span className="text-xs font-mono font-semibold text-foreground">
                  {t.count}d
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Absence table */}
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">
              Ausências por Assistente — Jan 2026
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  {[
                    "Assistente",
                    "Tipo",
                    "Dias",
                    "Estado",
                    "Cobertura",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {REPORTS_ABSENCES.map((r, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-primary font-mono">
                            {r.initials}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-foreground whitespace-nowrap">
                          {r.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {r.type}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-foreground">
                      {r.days > 0 ? `${r.days}d` : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {r.status === "approved" && (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        >
                          Aprovada
                        </Badge>
                      )}
                      {r.status === "pending" && (
                        <Badge
                          variant="outline"
                          className="bg-amber-500/10 text-amber-600 border-amber-500/20"
                        >
                          Pendente
                        </Badge>
                      )}
                      {r.status === "rejected" && (
                        <Badge
                          variant="outline"
                          className="bg-destructive/10 text-destructive border-destructive/20"
                        >
                          Rejeitada
                        </Badge>
                      )}
                      {r.status === "none" && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        variant="outline"
                        className={
                          r.coverage === "impacto alto"
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : r.coverage === "impacto médio"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            : r.coverage === "impacto baixo"
                            ? "bg-muted text-muted-foreground border-border"
                            : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        }
                      >
                        {r.coverage}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

