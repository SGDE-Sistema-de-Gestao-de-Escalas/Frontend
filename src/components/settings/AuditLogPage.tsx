import React, { useState } from "react";
import { Download } from "lucide-react";
import { AUDIT_LOG } from "../../api/mockData";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";

export default function AuditLogPage() {
  const [selectedFilterType, setSelectedFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const typeStyles: Record<string, { badgeClass: string; dot: string }> = {
    approve: {
      badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      dot: "bg-[#0E7C59]",
    },
    reject: {
      badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
      dot: "bg-[#C8291A]",
    },
    edit: {
      badgeClass: "bg-primary/10 text-primary border-primary/20",
      dot: "bg-[#1A56DB]",
    },
    create: {
      badgeClass: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      dot: "bg-[#7C3AED]",
    },
    system: {
      badgeClass: "bg-muted text-muted-foreground border-border",
      dot: "bg-[#5A6478]",
    },
    alert: {
      badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      dot: "bg-[#D97706]",
    },
  };

  const typeLabels: Record<string, string> = {
    approve: "Aprovação",
    reject: "Rejeição",
    edit: "Edição",
    create: "Criação",
    system: "Sistema",
    alert: "Alerta",
  };

  const filteredLogs = AUDIT_LOG.filter((l) => {
    if (selectedFilterType !== "all" && l.type !== selectedFilterType) return false;
    if (
      searchTerm &&
      !l.detail.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !l.user.toLowerCase().includes(searchTerm.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">
          Log de Auditoria
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Registo imutável de todas as acções do sistema
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Pesquisar por acção ou utilizador..."
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <div className="flex flex-wrap gap-1">
          {["all", "approve", "reject", "edit", "create", "system", "alert"].map(
            (t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedFilterType(t)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedFilterType === t
                    ? "bg-accent text-white"
                    : "border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "all" ? "Todos" : typeLabels[t]}
              </button>
            )
          )}
        </div>
      </div>

      {/* Log table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                {[
                  "Data / Hora",
                  "Utilizador",
                  "Acção",
                  "Módulo",
                  "Detalhe",
                  "Tipo",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {log.ts}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-[8px] font-bold text-muted-foreground">
                          {log.user === "Sistema"
                            ? "S"
                            : log.user
                                .split(" ")
                                .map((w) => w[0])
                                .join("")}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-foreground whitespace-nowrap">
                        {log.user}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-foreground whitespace-nowrap">
                    {log.action}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className="bg-muted text-muted-foreground border-border"
                    >
                      {log.entity}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs">
                    {log.detail}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          typeStyles[log.type]?.dot
                        }`}
                      />
                      <Badge
                        variant="outline"
                        className={typeStyles[log.type]?.badgeClass}
                      >
                        {typeLabels[log.type]}
                      </Badge>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-border bg-muted/10 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {filteredLogs.length} entradas
          </span>
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors"
          >
            <Download size={12} />
            Exportar CSV
          </button>
        </div>
      </Card>
    </div>
  );
}

