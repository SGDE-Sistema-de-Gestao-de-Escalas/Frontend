import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  Info,
  Repeat,
  X,
} from "lucide-react";
import { SWAP_REQUESTS } from "../../api/mockData";
import type { SwapRequest } from "../../types";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";

export default function ShiftSwapsPage() {
  const [swaps, setSwaps] = useState<SwapRequest[]>(SWAP_REQUESTS);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("pending");
  const [selectedSwapId, setSelectedSwapId] = useState<number | null>(1);

  const filteredSwaps = swaps.filter((s) => statusFilter === "all" || s.status === statusFilter);
  const selectedSwap = swaps.find((s) => s.id === selectedSwapId);

  function handleSwapDecision(id: number, action: "approved" | "rejected") {
    setSwaps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: action } : s))
    );
    setSelectedSwapId(null);
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">
          Trocas de Turno
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Pedidos de troca de turno entre assistentes
        </p>
      </div>

      <div
        className="grid grid-cols-1 lg:grid-cols-5 gap-4"
        style={{ minHeight: 520 }}
      >
        {/* Inbox */}
        <div
          className={`lg:col-span-2 flex flex-col border border-border rounded-lg overflow-hidden bg-card ${
            selectedSwapId ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="px-3 py-2 border-b border-border bg-muted/20 flex items-center gap-1 flex-wrap">
            {(["pending", "approved", "rejected", "all"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  statusFilter === f
                    ? "bg-accent text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "pending"
                  ? "Pendentes"
                  : f === "approved"
                  ? "Aprovados"
                  : f === "rejected"
                  ? "Rejeitados"
                  : "Todos"}
                {f === "pending" && (
                  <span className="ml-1 bg-[#C8291A] text-white rounded-full px-1 text-[9px]">
                    {swaps.filter((s) => s.status === "pending").length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredSwaps.length === 0 && (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Sem pedidos
              </div>
            )}
            {filteredSwaps.map((swap) => (
              <button
                key={swap.id}
                type="button"
                onClick={() => setSelectedSwapId(swap.id)}
                className={`w-full text-left px-3 py-3 border-b border-border/50 transition-colors hover:bg-muted/30 ${
                  selectedSwapId === swap.id
                    ? "bg-accent/5 border-l-2 border-l-accent"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-foreground">
                    {swap.from} ↔ {swap.to}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
                    {swap.submitted}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {swap.date} · {swap.reason}
                </p>
                <div className="mt-1.5">
                  {swap.status === "pending" && (
                    <Badge
                      variant="outline"
                      className="bg-amber-500/10 text-amber-600 border-amber-500/20"
                    >
                      Pendente
                    </Badge>
                  )}
                  {swap.status === "approved" && (
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    >
                      Aprovado
                    </Badge>
                  )}
                  {swap.status === "rejected" && (
                    <Badge
                      variant="outline"
                      className="bg-destructive/10 text-destructive border-destructive/20"
                    >
                      Rejeitado
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div
          className={`lg:col-span-3 ${selectedSwapId ? "block" : "hidden lg:block"}`}
        >
          {!selectedSwap ? (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center">
                <Repeat
                  size={28}
                  className="text-muted-foreground/25 mx-auto mb-2"
                />
                <p className="text-sm text-muted-foreground">
                  Selecione um pedido
                </p>
              </div>
            </Card>
          ) : (
            <Card className="h-full flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedSwapId(null)}
                  className="lg:hidden p-1 rounded hover:bg-muted mr-1"
                >
                  <ChevronLeft size={16} className="text-muted-foreground" />
                </button>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground text-sm">
                    Pedido de Troca #{selectedSwap.id}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Submetido em {selectedSwap.submitted}
                  </p>
                </div>
                {selectedSwap.status === "pending" && (
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-600 border-amber-500/20"
                  >
                    Pendente
                  </Badge>
                )}
                {selectedSwap.status === "approved" && (
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  >
                    Aprovado
                  </Badge>
                )}
                {selectedSwap.status === "rejected" && (
                  <Badge
                    variant="outline"
                    className="bg-destructive/10 text-destructive border-destructive/20"
                  >
                    Rejeitado
                  </Badge>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Swap visualization */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-muted/30 rounded-xl p-4 text-center">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                      <span className="text-xs font-bold text-primary font-mono">
                        {selectedSwap.fromInit}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-foreground">
                      {selectedSwap.from}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-1">
                      {selectedSwap.fromBlock}
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <ArrowRight size={16} className="text-muted-foreground" />
                    <span className="text-[9px] text-muted-foreground font-mono">
                      {selectedSwap.date}
                    </span>
                    <ArrowLeft size={16} className="text-muted-foreground" />
                  </div>
                  <div className="flex-1 bg-muted/30 rounded-xl p-4 text-center">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                      <span className="text-xs font-bold text-primary font-mono">
                        {selectedSwap.toInit}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-foreground">
                      {selectedSwap.to}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-1">
                      {selectedSwap.toBlock}
                    </p>
                  </div>
                </div>
                <div className="bg-muted/20 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Motivo</p>
                  <p className="text-sm text-foreground">
                    {selectedSwap.reason}
                  </p>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-accent/5 border border-accent/20">
                  <Info size={13} className="text-accent mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    A aprovação desta troca será validada contra as regras
                    mínimas de cobertura. Um recálculo automático será efectuado.
                  </p>
                </div>
              </div>
              {selectedSwap.status === "pending" && (
                <div className="px-5 py-4 border-t border-border flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleSwapDecision(selectedSwap.id, "approved")}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0E7C59] text-white text-sm font-medium hover:bg-[#0A6349] transition-colors"
                  >
                    <Check size={14} />
                    Aprovar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwapDecision(selectedSwap.id, "rejected")}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#C8291A]/30 text-[#C8291A] text-sm font-medium hover:bg-[#FEF2F2] transition-colors"
                  >
                    <X size={14} />
                    Rejeitar
                  </button>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

