import { useState, useMemo } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  Inbox,
  Loader2,
  Printer,
  Users,
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
  CartesianGrid,
} from "recharts";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import DateRangePicker, { type DateRange } from "../common/DateRangePicker";
import { useReports } from "../../hooks/api/useReports";
import { useSchool } from "../../context/SchoolContext";

function getSchoolYearStartIso(refDate: Date = new Date()): string {
  const y = refDate.getFullYear();
  const m = refDate.getMonth(); // 0 = Jan ... 8 = Sep
  const startYear = m >= 8 ? y : y - 1;
  return `${startYear}-09-01`;
}

function getTodayIso(refDate: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${refDate.getFullYear()}-${pad(refDate.getMonth() + 1)}-${pad(refDate.getDate())}`;
}

const PIE_COLORS = [
  "#2563EB", // Primary Blue
  "#D97706", // Amber
  "#0E7C59", // Emerald
  "#C8291A", // Red
  "#7C3AED", // Purple
  "#DB2777", // Pink
  "#0891B2", // Cyan
  "#475569", // Slate
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: any;
    color?: string;
    fill?: string;
    payload?: any;
    dataKey?: string;
  }>;
  label?: string;
}

function CoverageChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  const covered = data?.coveredHours ?? 0;
  const required = data?.requiredHours ?? 0;
  const gap = data?.gapHours ?? 0;
  const rate = required > 0 ? Math.round((covered / required) * 100) : 100;

  return (
    <div className="bg-popover text-popover-foreground border border-border shadow-xl rounded-lg p-3 text-xs min-w-[180px] pointer-events-none backdrop-blur-md">
      <div className="font-semibold text-foreground mb-2 pb-1.5 border-b border-border/60 flex items-center justify-between gap-2">
        <span className="truncate">{data?.date || label}</span>
        <span
          className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${
            rate >= 100
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              : rate >= 80
              ? "bg-primary/15 text-primary border border-primary/20"
              : "bg-destructive/15 text-destructive border border-destructive/20"
          }`}
        >
          {rate}%
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#2563EB] shrink-0" />
            <span>Horas Cumpridas:</span>
          </div>
          <span className="font-mono font-semibold text-foreground">{covered}h</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-sm bg-muted-foreground/30 shrink-0" />
            <span>Horas Necessárias:</span>
          </div>
          <span className="font-mono font-semibold text-foreground">{required}h</span>
        </div>
        {gap > 0 && (
          <div className="flex items-center justify-between gap-3 pt-1.5 border-t border-border/60 text-destructive">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-sm bg-destructive shrink-0" />
              <span>Défice / Falta:</span>
            </div>
            <span className="font-mono font-bold">{gap}h</span>
          </div>
        )}
      </div>
    </div>
  );
}

function AlertsChartTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-popover text-popover-foreground border border-border shadow-xl rounded-lg p-3 text-xs min-w-[170px] pointer-events-none backdrop-blur-md">
      <div className="font-semibold text-foreground mb-2 pb-1.5 border-b border-border/60">
        {data.month}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{
                backgroundColor:
                  data.alerts >= 5 ? "#C8291A" : data.alerts >= 2 ? "#D97706" : "#2563EB",
              }}
            />
            <span>Défices / Vagas:</span>
          </div>
          <span className="font-mono font-semibold text-foreground">
            {data.alerts} {data.alerts === 1 ? "alerta" : "alertas"}
          </span>
        </div>
        {data.hours > 0 && (
          <div className="flex items-center justify-between gap-3 pt-1.5 border-t border-border/60">
            <span className="text-muted-foreground">Tempo a descoberto:</span>
            <span className="font-mono font-bold text-destructive">
              {data.hours}h
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function AbsencePieTooltip({
  active,
  payload,
  totalHours,
}: CustomTooltipProps & { totalHours: number }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  const hours = data.hours ?? 0;
  const pct = totalHours > 0 ? Math.round((hours / totalHours) * 100) : 0;

  return (
    <div className="bg-popover text-popover-foreground border border-border shadow-xl rounded-lg p-3 text-xs min-w-[180px] pointer-events-none backdrop-blur-md">
      <div className="flex items-center gap-2 font-semibold text-foreground mb-2 pb-1.5 border-b border-border/60">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: data.color }}
        />
        <span className="truncate">{data.type}</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Horas Ausência:</span>
          <span className="font-mono font-semibold text-foreground">{hours}h</span>
        </div>
        {data.days > 0 && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Dias de Trabalho:</span>
            <span className="font-mono text-foreground">{data.days}d</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 pt-1.5 border-t border-border/60">
          <span className="text-muted-foreground">Quota de Ausências:</span>
          <span className="font-mono font-bold text-foreground">{pct}%</span>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { selectedSchool } = useSchool();

  // O valor default deste DateRangePicker e desde o dia 1 do ultimo setembro ate hoje (ano letivo atual)
  const defaultRange = useMemo<DateRange>(() => {
    return {
      startDate: getSchoolYearStartIso(),
      endDate: getTodayIso(),
    };
  }, []);

  const [dateRange, setDateRange] = useState<DateRange>(defaultRange);
  const [activeTab, setActiveTab] = useState<"overview" | "workload">("overview");

  // Presets especificos para relatorios executivos de gestao escolar
  const reportPresets = useMemo(() => {
    const t = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const schoolYearStart = getSchoolYearStartIso(t);
    const todayStr = toIso(t);

    const firstThisMonth = toIso(new Date(t.getFullYear(), t.getMonth(), 1));
    const lastThisMonth = toIso(new Date(t.getFullYear(), t.getMonth() + 1, 0));

    const firstLastMonth = toIso(new Date(t.getFullYear(), t.getMonth() - 1, 1));
    const lastLastMonth = toIso(new Date(t.getFullYear(), t.getMonth(), 0));

    const last30Days = new Date(t);
    last30Days.setDate(t.getDate() - 30);

    const last90Days = new Date(t);
    last90Days.setDate(t.getDate() - 90);

    return [
      { label: "Ano Letivo (Desde 1 Set)", start: schoolYearStart, end: todayStr },
      { label: "Este Mês", start: firstThisMonth, end: lastThisMonth },
      { label: "Mês Passado", start: firstLastMonth, end: lastLastMonth },
      { label: "Últimos 30 Dias", start: toIso(last30Days), end: todayStr },
      { label: "Últimos 90 Dias", start: toIso(last90Days), end: todayStr },
    ];
  }, []);

  // Consulta da API real do Backend
  const { data: reportData, isLoading, error } = useReports(
    dateRange.startDate,
    dateRange.endDate
  );

  const summary = reportData?.summary;
  const coverageRate = summary?.coverage_rate ?? null;
  const totalRequiredHours = Math.round((summary?.required_minutes ?? 0) / 60);
  const totalCoveredHours = Math.round((summary?.covered_minutes ?? 0) / 60);
  const totalUncoveredHours = Math.round((summary?.uncovered_minutes ?? 0) / 60);
  const totalAbsenceHours = Math.round((summary?.absence_minutes ?? 0) / 60);

  // Cards de KPI
  const kpis = [
    {
      label: "Taxa de Cobertura",
      value: coverageRate !== null ? `${coverageRate}%` : "—",
      sub: `${totalCoveredHours}h de ${totalRequiredHours}h necessárias`,
      icon: <CheckCircle2 size={16} />,
      variant:
        coverageRate === null
          ? ("muted" as const)
          : coverageRate >= 95
          ? ("success" as const)
          : coverageRate >= 80
          ? ("warning" as const)
          : ("danger" as const),
    },
    {
      label: "Alertas de Cobertura",
      value: String(summary?.total_gaps_count ?? 0),
      sub: `${totalUncoveredHours}h a descoberto no período`,
      icon: <AlertCircle size={16} />,
      variant: (summary?.total_gaps_count ?? 0) > 0 ? ("danger" as const) : ("success" as const),
    },
    {
      label: "Ausências Pendentes",
      value: String(summary?.pending_absences_count ?? 0),
      sub: "aguardam aprovação / validação",
      icon: <Inbox size={16} />,
      variant: (summary?.pending_absences_count ?? 0) > 0 ? ("warning" as const) : ("success" as const),
    },
    {
      label: "Horas de Ausência",
      value: `${totalAbsenceHours}h`,
      sub: `${summary?.affected_assistants ?? 0} assistentes afetados`,
      icon: <UserX size={16} />,
      variant: "muted" as const,
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

  // 1. Dados do Gráfico de Cobertura Diária / Semanal
  const coverageChartData = useMemo(() => {
    if (!reportData?.daily_coverage) return [];
    const openDays = reportData.daily_coverage.filter((d) => d.is_open);

    // Se o período for longo (> 31 dias), agrupamos por semana para o gráfico ficar legível
    if (openDays.length > 31) {
      const weeksMap: Record<
        string,
        { label: string; covered: number; required: number; gap: number }
      > = {};

      openDays.forEach((d) => {
        // Obter início da semana do dia
        const dt = new Date(d.date + "T12:00:00");
        const dow = (dt.getDay() + 6) % 7;
        const mon = new Date(dt);
        mon.setDate(dt.getDate() - dow);
        const pad = (n: number) => String(n).padStart(2, "0");
        const weekKey = `${mon.getFullYear()}-${pad(mon.getMonth() + 1)}-${pad(mon.getDate())}`;
        const weekLabel = `Sem ${pad(mon.getDate())}/${pad(mon.getMonth() + 1)}`;

        if (!weeksMap[weekKey]) {
          weeksMap[weekKey] = { label: weekLabel, covered: 0, required: 0, gap: 0 };
        }
        weeksMap[weekKey].covered += d.covered_minutes;
        weeksMap[weekKey].required += d.required_minutes;
        weeksMap[weekKey].gap += d.uncovered_minutes;
      });

      return Object.values(weeksMap).map((w) => ({
        name: w.label,
        coveredHours: Math.round((w.covered / 60) * 10) / 10,
        requiredHours: Math.round((w.required / 60) * 10) / 10,
        gapHours: Math.round((w.gap / 60) * 10) / 10,
        hasDeficit: w.gap > 0,
      }));
    }

    // Período mais curto (até 31 dias): mostra dia a dia
    const dayNames = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    return openDays.map((d) => {
      const parts = d.date.split("-");
      const dayNum = parts[2];
      const monNum = parts[1];
      const dowLabel = dayNames[d.day_of_week] || "";
      const label = `${dowLabel} ${dayNum}/${monNum}`;

      return {
        name: label,
        date: d.date,
        coveredHours: Math.round((d.covered_minutes / 60) * 10) / 10,
        requiredHours: Math.round((d.required_minutes / 60) * 10) / 10,
        gapHours: Math.round((d.uncovered_minutes / 60) * 10) / 10,
        hasDeficit: d.uncovered_minutes > 0,
      };
    });
  }, [reportData?.daily_coverage]);

  // 2. Dados do Gráfico de Incumprimentos / Alertas por Mês
  const alertsChartData = useMemo(() => {
    if (!reportData?.coverage_gaps) return [];
    const gaps = reportData.coverage_gaps;
    const monthNames = [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
      "Jul", "Ago", "Set", "Out", "Nov", "Dez",
    ];

    const monthsMap: Record<string, { month: string; alerts: number; hours: number }> = {};
    gaps.forEach((g) => {
      const parts = g.date.split("-");
      const y = parts[0];
      const m = parseInt(parts[1], 10) - 1;
      const key = `${y}-${m}`;
      const label = `${monthNames[m]} ${y.slice(2)}`;

      if (!monthsMap[key]) {
        monthsMap[key] = { month: label, alerts: 0, hours: 0 };
      }
      monthsMap[key].alerts += 1;
      monthsMap[key].hours += Math.round((g.uncovered_minutes / 60) * 10) / 10;
    });

    const entries = Object.values(monthsMap);
    if (entries.length === 0) {
      return [{ month: "Sem Alertas", alerts: 0, hours: 0 }];
    }
    return entries;
  }, [reportData?.coverage_gaps]);

  // 3. Dados de Ausências por Tipo para o PieChart
  const absenceTypesData = useMemo(() => {
    if (!reportData?.absences_by_type) return [];
    return reportData.absences_by_type.map((t, idx) => ({
      type: t.name || "Outra",
      minutes: t.absence_minutes,
      hours: Math.round(t.absence_minutes / 60),
      days: Math.round((t.absence_minutes / 60 / 7) * 10) / 10,
      color: PIE_COLORS[idx % PIE_COLORS.length],
    }));
  }, [reportData?.absences_by_type]);

  const totalAbsencePieHours = useMemo(
    () => absenceTypesData.reduce((s, t) => s + t.hours, 0),
    [absenceTypesData]
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho com Título, Seletor de Período e Botão de Exportar */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground">Relatórios Executivos</h2>
            {selectedSchool && (
              <Badge variant="outline" className="text-xs">
                {selectedSchool.name}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Análise de cobertura horária, absentismo, défices de escala e carga horária
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker
            value={dateRange}
            customPresets={reportPresets}
            allowClear={false}
            onChange={(range) => {
              if (range.startDate && range.endDate) {
                setDateRange(range);
              }
            }}
            className="w-[280px]"
          />
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-card hover:bg-muted shadow-2xs"
            title="Imprimir ou exportar relatório em PDF"
          >
            <Printer size={13} />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Indicador de Carregamento Global */}
      {isLoading && (
        <div className="p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2 bg-card border border-border rounded-xl">
          <Loader2 size={16} className="animate-spin text-primary" />
          <span>A carregar métricas de relatórios para o período selecionado...</span>
        </div>
      )}

      {/* Erro de Carregamento */}
      {error && !isLoading && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2.5">
          <AlertCircle size={16} className="shrink-0" />
          <span>
            Não foi possível carregar os dados do relatório. Verifique se tem uma escola ativa selecionada.
          </span>
        </div>
      )}

      {/* Conteúdo Principal quando Carregado */}
      {!isLoading && reportData && (
        <>
          {/* Cartões de KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.map((k) => {
              const s = variantStyles[k.variant];
              return (
                <Card key={k.label} className="p-4 shadow-2xs">
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

          {/* Abas de Navegação entre Visão Geral e Carga Horária */}
          <div className="flex items-center gap-2 border-b border-border pb-1">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 ${
                activeTab === "overview"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Visão Geral e Cobertura
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("workload")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 ${
                activeTab === "workload"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Carga Horária por Assistente ({reportData.workload_by_assistant?.length ?? 0})
            </button>
          </div>

          {activeTab === "overview" && (
            <>
              {/* Linha dos 2 Primeiros Gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 1. Cobertura vs Mínimo */}
                <Card className="p-4 shadow-2xs">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="text-sm font-semibold text-foreground">
                      Cumprimento de Horas Necessárias
                    </h3>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {coverageChartData.length > 31 ? "Agrupado por Semana" : "Dias de Funcionamento"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Horas cumpridas vs horas mínimas obrigatórias no período
                  </p>
                  <div style={{ height: 210 }}>
                    {coverageChartData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                        Nenhum dia de funcionamento aberto encontrado no período.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={coverageChartData}
                          barGap={3}
                          barCategoryGap={coverageChartData.length > 20 ? "15%" : "30%"}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="currentColor"
                            className="text-border opacity-60"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 9, fill: "currentColor" }}
                            className="text-muted-foreground"
                            axisLine={false}
                            tickLine={false}
                            interval={coverageChartData.length > 20 ? 1 : 0}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: "currentColor" }}
                            className="text-muted-foreground"
                            axisLine={false}
                            tickLine={false}
                            unit="h"
                          />
                          <Tooltip
                            content={<CoverageChartTooltip />}
                            cursor={{ fill: "currentColor", opacity: 0.05 }}
                          />
                          <Bar
                            key="bar-covered"
                            dataKey="coveredHours"
                            radius={[3, 3, 0, 0]}
                            name="coveredHours"
                          >
                            {coverageChartData.map((e, i) => (
                              <Cell
                                key={`cov-${i}`}
                                fill={e.hasDeficit ? "#C8291A" : "#2563EB"}
                              />
                            ))}
                          </Bar>
                          <Bar
                            key="bar-req"
                            dataKey="requiredHours"
                            fill="currentColor"
                            className="text-muted-foreground/20 dark:text-muted-foreground/15"
                            radius={[3, 3, 0, 0]}
                            name="requiredHours"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-[#2563EB]" />
                      <span>Cumprido</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-[#C8291A]" />
                      <span>Défice / Falta de Cobertura</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-[#E2E8F0]" />
                      <span>Mínimo Necessário</span>
                    </div>
                  </div>
                </Card>

                {/* 2. Alertas de Cobertura / Incumprimentos por Mês */}
                <Card className="p-4 shadow-2xs">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="text-sm font-semibold text-foreground">
                      Incumprimentos de Regras por Mês
                    </h3>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {summary?.total_gaps_count ?? 0} ocorrências
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Número de intervalos sem rácio mínimo atingido
                  </p>
                  <div style={{ height: 210 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={alertsChartData} barCategoryGap="40%">
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="currentColor"
                          className="text-border opacity-60"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 10, fill: "currentColor" }}
                          className="text-muted-foreground"
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "currentColor" }}
                          className="text-muted-foreground"
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          content={<AlertsChartTooltip />}
                          cursor={{ fill: "currentColor", opacity: 0.05 }}
                        />
                        <Bar key="bar-alerts" dataKey="alerts" radius={[4, 4, 0, 0]}>
                          {alertsChartData.map((e, i) => (
                            <Cell
                              key={`alert-${i}`}
                              fill={
                                e.alerts >= 5
                                  ? "#C8291A"
                                  : e.alerts >= 2
                                  ? "#D97706"
                                  : e.alerts > 0
                                  ? "#2563EB"
                                  : "#0E7C59"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legenda de Alertas */}
                  <div className="flex items-center gap-4 mt-3 pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-[#0E7C59]" />
                      <span>Sem Falhas (0)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-[#2563EB]" />
                      <span>Normal (1)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-[#D97706]" />
                      <span>Atenção (2–4)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-[#C8291A]" />
                      <span>Crítico (≥5)</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Linha de Tipos de Ausência + Tabela de Ausências */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* 3. Ausências por Tipo (Donut Chart) */}
                <Card className="p-4 shadow-2xs">
                  <h3 className="text-sm font-semibold text-foreground mb-0.5">
                    Ausências por Motivo
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Horas totais por classificação de falta
                  </p>
                  <div style={{ height: 160 }} className="mb-3">
                    {absenceTypesData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
                        Nenhuma ausência registada no período.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={absenceTypesData}
                            dataKey="hours"
                            nameKey="type"
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={3}
                          >
                            {absenceTypesData.map((e, i) => (
                              <Cell key={`type-${i}`} fill={e.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={<AbsencePieTooltip totalHours={totalAbsencePieHours} />}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {absenceTypesData.map((t) => {
                      const pct =
                        totalAbsencePieHours > 0
                          ? Math.round((t.hours / totalAbsencePieHours) * 100)
                          : 0;
                      return (
                        <div key={t.type} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                              style={{ backgroundColor: t.color }}
                            />
                            <span className="text-muted-foreground truncate">{t.type}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-foreground shrink-0">
                            <span>{t.hours}h</span>
                            <span className="text-[10px] text-muted-foreground font-normal">
                              ({pct}%)
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* 4. Tabela de Ausências Reais por Assistente */}
                <Card className="lg:col-span-2 overflow-hidden shadow-2xs">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Registo de Ausências no Período
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {reportData.absences.length} registos encontrados
                      </p>
                    </div>
                  </div>
                  <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="border-b border-border bg-muted/90 backdrop-blur-xs">
                          {[
                            "Assistente",
                            "Tipo de Falta",
                            "Período",
                            "Impacto / Dias",
                            "Estado",
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
                        {reportData.absences.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-4 py-8 text-center text-xs text-muted-foreground italic"
                            >
                              Nenhuma ausência registada neste intervalo de datas.
                            </td>
                          </tr>
                        ) : (
                          reportData.absences.map((r) => {
                            const initials = (r.assistant_name || "AO")
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase();

                            const hours = Math.round(r.absence_minutes / 60);

                            return (
                              <tr
                                key={r.id}
                                className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                              >
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                      <span className="text-[10px] font-bold text-primary font-mono">
                                        {initials}
                                      </span>
                                    </div>
                                    <span className="text-xs font-medium text-foreground whitespace-nowrap">
                                      {r.assistant_name}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                                  {r.absence_type || "Geral"}
                                </td>
                                <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                                  {r.start_date === r.end_date
                                    ? r.start_date
                                    : `${r.start_date} → ${r.end_date || "termo"}`}
                                </td>
                                <td className="px-4 py-2.5 font-mono text-xs font-semibold text-foreground whitespace-nowrap">
                                  {r.affected_workdays > 0 ? `${r.affected_workdays}d` : "—"}
                                  {hours > 0 && (
                                    <span className="text-muted-foreground font-normal ml-1 text-[11px]">
                                      ({hours}h)
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 whitespace-nowrap">
                                  {r.status === "approved" || r.status === "justified" ? (
                                    <Badge
                                      variant="outline"
                                      className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
                                    >
                                      Justificada
                                    </Badge>
                                  ) : r.status === "pending" ? (
                                    <Badge
                                      variant="outline"
                                      className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]"
                                    >
                                      Pendente
                                    </Badge>
                                  ) : r.status === "rejected" || r.status === "unjustified" ? (
                                    <Badge
                                      variant="outline"
                                      className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]"
                                    >
                                      Injustificada
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px]">
                                      {r.status}
                                    </Badge>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </>
          )}

          {/* Aba 2: Carga Horária por Assistente */}
          {activeTab === "workload" && (
            <Card className="p-4 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Carga Horária e Cumprimento por Assistente Operacional
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Horas previstas contratualmente vs horas atribuídas em escala publicada
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      {[
                        "Assistente",
                        "Horas Previstas",
                        "Horas Escaladas",
                        "Horas Ausência",
                        "Cumprimento",
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
                    {reportData.workload_by_assistant?.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-xs text-muted-foreground italic"
                        >
                          Nenhum assistente com perfil ativo no período.
                        </td>
                      </tr>
                    ) : (
                      reportData.workload_by_assistant?.map((w) => {
                        const expHours = Math.round((w.expected_minutes / 60) * 10) / 10;
                        const asgHours = Math.round((w.assigned_minutes / 60) * 10) / 10;
                        const absHours = Math.round((w.absence_minutes / 60) * 10) / 10;
                        const pct =
                          w.expected_minutes > 0
                            ? Math.round((w.assigned_minutes / w.expected_minutes) * 100)
                            : 0;

                        return (
                          <tr
                            key={w.assistant_id}
                            className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                          >
                            <td className="px-4 py-3 font-medium text-foreground">
                              {w.assistant_name}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                              {expHours}h
                            </td>
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">
                              {asgHours}h
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-destructive">
                              {absHours > 0 ? `${absHours}h` : "—"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5 min-w-[120px]">
                                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      pct >= 95
                                        ? "bg-emerald-500"
                                        : pct >= 80
                                        ? "bg-primary"
                                        : "bg-amber-500"
                                    }`}
                                    style={{ width: `${Math.min(100, pct)}%` }}
                                  />
                                </div>
                                <span className="font-mono text-xs font-semibold text-foreground w-10 text-right">
                                  {pct}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
