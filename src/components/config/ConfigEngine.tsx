import React, { useState } from "react";
import { Clock, Layers, Shield, Umbrella } from "lucide-react";
import type { ConfigTab } from "../../types";
import FeriadosPage from "../settings/FeriadosPage";
import ActivityTypesTab from "./ActivityTypesTab";
import ScheduleRulesTab from "./ScheduleRulesTab";
import WindowsTab from "./WindowsTab";

export default function ConfigEngine() {
  const [activeTab, setActiveTab] = useState<ConfigTab>("security");

  const tabs: { id: ConfigTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "security",
      label: "Regras de Horário",
      icon: <Shield size={14} />,
    },
    { id: "windows", label: "Funcionamento", icon: <Clock size={14} /> },
    { id: "holidays", label: "Feriados", icon: <Umbrella size={14} /> },
    {
      id: "activity-types",
      label: "Tipos de Atividade",
      icon: <Layers size={14} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          Motor de Configurações
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gestão de regras com histórico de vigências e parametrização dinâmica
        </p>
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab.id
                ? "border-primary text-primary bg-primary/5 font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "security" && <ScheduleRulesTab />}
      {activeTab === "windows" && <WindowsTab />}
      {activeTab === "holidays" && <FeriadosPage />}
      {activeTab === "activity-types" && <ActivityTypesTab />}
    </div>
  );
}

