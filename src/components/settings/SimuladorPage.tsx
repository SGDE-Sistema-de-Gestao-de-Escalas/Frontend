import React, { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Sliders,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { assistants as ASSISTANTS } from "../../api/mockData";
import DatePicker from "../common/DatePicker";

export default function SimuladorPage() {
  const [selectedAssistant, setSelectedAssistant] = useState<number | null>(
    null
  );
  const [startDate, setStartDate] = useState("2026-02-03");
  const [endDate, setEndDate] = useState("2026-02-05");
  const [simulated, setSimulated] = useState(false);

  const assistant = ASSISTANTS.find((a) => a.id === selectedAssistant);

  const impactDays = [
    { day: "Ter 03 Fev", before: 10, after: 9, alert: false },
    { day: "Qua 04 Fev", before: 11, after: 10, alert: false },
    { day: "Qui 05 Fev", before: 8, after: 7, alert: true },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">
          Simulador de Escala
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Analise o impacto de uma ausência antes de aprovar
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config panel */}
        <Card className="p-5 lg:col-span-1">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Parâmetros
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">
                Assistente *
              </label>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                value={selectedAssistant ?? ""}
                onChange={(e) => {
                  setSelectedAssistant(Number(e.target.value));
                  setSimulated(false);
                }}
              >
                <option value="">Selecionar assistente...</option>
                {ASSISTANTS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">
                Data de Início *
              </label>
              <DatePicker
                value={startDate}
                onChange={(v) => {
                  setStartDate(v);
                  setSimulated(false);
                }}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">
                Data de Fim *
              </label>
              <DatePicker
                value={endDate}
                onChange={(v) => {
                  setEndDate(v);
                  setSimulated(false);
                }}
                className="w-full"
              />
            </div>
            <button
              type="button"
              disabled={!selectedAssistant}
              onClick={() => setSimulated(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors shadow-xs"
            >
              <Activity size={14} />
              Simular Impacto
            </button>
          </div>
        </Card>

        {/* Result panel */}
        <div className="lg:col-span-2 space-y-4">
          {!simulated ? (
            <Card className="h-64 flex items-center justify-center">
              <div className="text-center">
                <Sliders
                  size={32}
                  className="text-muted-foreground/20 mx-auto mb-2"
                />
                <p className="text-sm text-muted-foreground">
                  Configure os parâmetros e clique em "Simular Impacto"
                </p>
              </div>
            </Card>
          ) : (
            <>
              {/* Summary alert */}
              {impactDays.some((d) => d.alert) ? (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-[#FEF2F2] border border-[#C8291A]/20">
                  <AlertTriangle
                    size={16}
                    className="text-[#C8291A] flex-shrink-0 mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-semibold text-[#7F1D1D]">
                      Atenção: Cobertura insuficiente detectada
                    </p>
                    <p className="text-xs text-[#C8291A] mt-0.5">
                      A ausência de <strong>{assistant?.name}</strong> em{" "}
                      {startDate} – {endDate} causará cobertura abaixo do mínimo
                      em 1 dia.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-[#F0FDF4] border border-[#0E7C59]/20">
                  <CheckCircle
                    size={16}
                    className="text-[#0E7C59] flex-shrink-0 mt-0.5"
                  />
                  <p className="text-sm text-[#0E7C59]">
                    Ausência aprovável: todos os dias mantêm cobertura mínima.
                  </p>
                </div>
              )}

              {/* Impact per day */}
              <Card className="overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground">
                    Impacto por Dia
                  </h3>
                </div>
                <div className="divide-y divide-border">
                  {impactDays.map((d, i) => (
                    <div
                      key={i}
                      className={`px-4 py-3 flex items-center gap-4 ${
                        d.alert ? "bg-[#FEF2F2]" : ""
                      }`}
                    >
                      <span className="text-xs font-mono font-medium w-24 flex-shrink-0">
                        {d.day}
                      </span>
                      <div className="flex-1 flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">
                            Antes:
                          </span>
                          <span className="text-xs font-mono font-semibold text-foreground">
                            {d.before}/12
                          </span>
                        </div>
                        <ArrowRight
                          size={12}
                          className="text-muted-foreground"
                        />
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">
                            Depois:
                          </span>
                          <span
                            className={`text-xs font-mono font-semibold ${
                              d.alert ? "text-[#C8291A]" : "text-[#0E7C59]"
                            }`}
                          >
                            {d.after}/12
                          </span>
                        </div>
                      </div>
                      {d.alert ? (
                        <Badge
                          variant="outline"
                          className="bg-destructive/10 text-destructive border-destructive/20"
                        >
                          Abaixo do mínimo
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        >
                          OK
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Coverage chart */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Comparação de Cobertura
                </h3>
                <div style={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={impactDays} barGap={4}>
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
                        domain={[0, 12]}
                      />
                      <Tooltip
                        contentStyle={{
                          fontSize: 11,
                          borderRadius: 8,
                          border: "1px solid #E8EBF2",
                        }}
                      />
                      <Bar
                        key="bar-before"
                        dataKey="before"
                        fill="#1A56DB"
                        radius={[3, 3, 0, 0]}
                        name="Antes"
                        opacity={0.4}
                      />
                      <Bar
                        key="bar-after"
                        dataKey="after"
                        fill="#1A56DB"
                        radius={[3, 3, 0, 0]}
                        name="Depois"
                      >
                        {impactDays.map((d, i) => (
                          <Cell
                            key={`sim-cell-${i}`}
                            fill={d.alert ? "#C8291A" : "#0E7C59"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

