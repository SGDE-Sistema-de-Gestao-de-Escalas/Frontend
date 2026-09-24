import React, { useState } from "react";
import {
  Building2,
  CheckCircle,
  FileText,
  Globe,
  MapPin,
  Paperclip,
  Pencil,
  Plus,
  Settings,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  AGRUPAMENTO,
  schools as INITIAL_SCHOOLS,
  absenceTypes as INITIAL_ABSENCE_TYPES,
} from "../../api/mockData";
import type { School, AbsenceType } from "../../types";
import Modal from "../common/Modal";

export default function PlatformSettingsPage() {
  const [activeTab, setActiveTab] = useState<"schools" | "absence-types">("schools");

  // ── Schools state ─────────────────────────────────────────────────────────
  const [schoolsList, setSchoolsList] = useState<School[]>(
    INITIAL_SCHOOLS.map((s) => ({ ...s }))
  );
  const [showSchoolForm, setShowSchoolForm] = useState(false);
  const [schoolEditId, setSchoolEditId] = useState<number | null>(null);
  const [schoolDeleteConfirm, setSchoolDeleteConfirm] = useState<number | null>(
    null
  );
  const [schoolName, setSchoolName] = useState("");
  const [schoolAddress, setSchoolAddress] = useState("");
  const [schoolPhone, setSchoolPhone] = useState("");

  function openAddSchool() {
    setSchoolName("");
    setSchoolAddress("");
    setSchoolPhone("");
    setSchoolEditId(null);
    setShowSchoolForm(true);
  }

  function openEditSchool(s: School) {
    setSchoolName(s.name);
    setSchoolAddress(s.address);
    setSchoolPhone(s.phone);
    setSchoolEditId(s.id);
    setShowSchoolForm(true);
  }

  function handleSaveSchool() {
    if (!schoolName.trim()) return;
    if (schoolEditId !== null) {
      setSchoolsList((p) =>
        p.map((s) =>
          s.id === schoolEditId
            ? {
                ...s,
                name: schoolName,
                address: schoolAddress,
                phone: schoolPhone,
              }
            : s
        )
      );
    } else {
      setSchoolsList((p) => [
        ...p,
        {
          id: p.length + 1,
          name: schoolName,
          address: schoolAddress,
          phone: schoolPhone,
          active: true,
          assistants: 0,
        },
      ]);
    }
    setShowSchoolForm(false);
  }

  function toggleSchoolActive(id: number) {
    setSchoolsList((p) =>
      p.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    );
  }

  function deleteSchool(id: number) {
    setSchoolsList((p) => p.filter((s) => s.id !== id));
    setSchoolDeleteConfirm(null);
  }

  // ── Absence types state ───────────────────────────────────────────────────
  const [absenceTypesList, setAbsenceTypesList] = useState<AbsenceType[]>(
    INITIAL_ABSENCE_TYPES.map((t) => ({ ...t }))
  );
  const [showAbsenceTypeForm, setShowAbsenceTypeForm] = useState(false);
  const [absenceTypeEditId, setAbsenceTypeEditId] = useState<number | null>(null);
  const [absenceTypeDeleteConfirm, setAbsenceTypeDeleteConfirm] = useState<number | null>(null);
  const [absenceTypeName, setAbsenceTypeName] = useState("");
  const [absenceTypeRequiresDoc, setAbsenceTypeRequiresDoc] = useState(false);

  function openAddAbsenceType() {
    setAbsenceTypeName("");
    setAbsenceTypeRequiresDoc(false);
    setAbsenceTypeEditId(null);
    setShowAbsenceTypeForm(true);
  }

  function openEditAbsenceType(t: AbsenceType) {
    setAbsenceTypeName(t.name);
    setAbsenceTypeRequiresDoc(t.requiresDocument ?? t.requires_document ?? false);
    setAbsenceTypeEditId(t.id);
    setShowAbsenceTypeForm(true);
  }

  function handleSaveAbsenceType() {
    if (!absenceTypeName.trim()) return;
    if (absenceTypeEditId !== null) {
      setAbsenceTypesList((p) =>
        p.map((t) =>
          t.id === absenceTypeEditId
            ? {
                ...t,
                name: absenceTypeName,
                requiresDocument: absenceTypeRequiresDoc,
                requires_document: absenceTypeRequiresDoc,
              }
            : t
        )
      );
    } else {
      setAbsenceTypesList((p) => [
        ...p,
        {
          id: p.length > 0 ? Math.max(...p.map((t) => t.id)) + 1 : 1,
          name: absenceTypeName,
          requiresDocument: absenceTypeRequiresDoc,
          requires_document: absenceTypeRequiresDoc,
        },
      ]);
    }
    setShowAbsenceTypeForm(false);
  }

  function deleteAbsenceType(id: number) {
    setAbsenceTypesList((p) => p.filter((t) => t.id !== id));
    setAbsenceTypeDeleteConfirm(null);
  }

  const TABS = [
    {
      id: "schools" as const,
      label: "Escolas",
      icon: <Building2 size={14} />,
    },
    {
      id: "absence-types" as const,
      label: "Tipos de Falta",
      icon: <FileText size={14} />,
    },
  ];

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Settings size={16} className="text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          Configurações da Plataforma
        </h2>
      </div>
      <p className="text-sm text-muted-foreground ml-10 mb-6">
        Gestão do agrupamento, escolas e parametrizações do sistema
      </p>

      {/* Agrupamento card */}
      <div className="mb-6 p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Globe size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {AGRUPAMENTO.name}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {AGRUPAMENTO.code}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
          {[
            {
              label: "Escolas Ativas",
              value: schoolsList.filter((s) => s.active).length,
            },
            { label: "Total Escolas", value: schoolsList.length },
            {
              label: "Assistentes",
              value: schoolsList.reduce((a, s) => a + s.assistants, 0),
            },
          ].map((kpi) => (
            <div key={kpi.label} className="text-center">
              <p className="text-xl font-mono font-bold text-foreground">
                {kpi.value}
              </p>
              <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.id
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Escolas */}
      {activeTab === "schools" && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              Escolas do Agrupamento
            </h3>
            <button
              type="button"
              onClick={openAddSchool}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors"
            >
              <Plus size={13} />
              Nova Escola
            </button>
          </div>
          <div className="space-y-3">
            {schoolsList.map((school) => (
              <div
                key={school.id}
                className={`p-4 rounded-xl border transition-colors ${
                  school.active
                    ? "border-border bg-card"
                    : "border-border/50 bg-muted/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      school.active ? "bg-primary/10" : "bg-muted"
                    }`}
                  >
                    <Building2
                      size={16}
                      className={
                        school.active ? "text-primary" : "text-muted-foreground"
                      }
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className={`text-sm font-semibold ${
                          school.active
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {school.name}
                      </p>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          school.active
                            ? "bg-[#0E7C59]/10 text-[#0E7C59]"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {school.active ? "Ativa" : "Inativa"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <MapPin size={10} />
                      <span className="truncate">{school.address}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
                      <span>{school.phone}</span>
                      <span>
                        {school.assistants} assistente
                        {school.assistants !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditSchool(school)}
                      className="p-1.5 rounded hover:bg-muted transition-colors"
                      title="Editar"
                    >
                      <Pencil size={13} className="text-muted-foreground" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSchoolActive(school.id)}
                      className="p-1.5 rounded hover:bg-muted transition-colors"
                      title={school.active ? "Desativar" : "Ativar"}
                    >
                      {school.active ? (
                        <XCircle size={13} className="text-muted-foreground" />
                      ) : (
                        <CheckCircle
                          size={13}
                          className="text-muted-foreground"
                        />
                      )}
                    </button>
                    {schoolDeleteConfirm === school.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => deleteSchool(school.id)}
                          className="px-2 py-1 rounded bg-destructive text-white text-[10px] font-medium"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setSchoolDeleteConfirm(null)}
                          className="px-2 py-1 rounded border border-border text-[10px] text-muted-foreground"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSchoolDeleteConfirm(school.id)}
                        className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2
                          size={13}
                          className="text-muted-foreground hover:text-destructive"
                        />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {showSchoolForm && (
            <Modal
              title={schoolEditId !== null ? "Editar Escola" : "Nova Escola"}
              subtitle="Dados de identificação da escola"
              onClose={() => setShowSchoolForm(false)}
            >
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">
                    Nome da Escola *
                  </label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="Ex: EB1 Quinta das Flores"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">
                    Morada
                  </label>
                  <input
                    type="text"
                    value={schoolAddress}
                    onChange={(e) => setSchoolAddress(e.target.value)}
                    placeholder="Rua, número, localidade"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={schoolPhone}
                    onChange={(e) => setSchoolPhone(e.target.value)}
                    placeholder="213 000 000"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveSchool}
                    disabled={!schoolName.trim()}
                    className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors"
                  >
                    {schoolEditId !== null ? "Guardar Alterações" : "Criar Escola"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSchoolForm(false)}
                    className="px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </>
      )}

      {/* Tab: Tipos de Falta */}
      {activeTab === "absence-types" && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Tipos de Falta
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Categorias utilizadas no registo de ausências
              </p>
            </div>
            <button
              type="button"
              onClick={openAddAbsenceType}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors"
            >
              <Plus size={13} />
              Novo Tipo
            </button>
          </div>
          <div className="space-y-2">
            {absenceTypesList.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText size={14} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {(t.requiresDocument ?? t.requires_document) ? (
                      <span className="flex items-center gap-1">
                        <Paperclip size={10} />
                        Requer documento comprovativo
                      </span>
                    ) : (
                      "Sem documento obrigatório"
                    )}
                  </p>
                </div>
                {absenceTypeDeleteConfirm === t.id ? (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => deleteAbsenceType(t.id)}
                      className="px-2 py-1 rounded bg-destructive text-white text-[10px] font-medium"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => setAbsenceTypeDeleteConfirm(null)}
                      className="px-2 py-1 rounded border border-border text-[10px] text-muted-foreground"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditAbsenceType(t)}
                      className="p-1.5 rounded hover:bg-muted transition-colors"
                      title="Editar"
                    >
                      <Pencil size={13} className="text-muted-foreground" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setAbsenceTypeDeleteConfirm(t.id)}
                      className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2
                        size={13}
                        className="text-muted-foreground hover:text-destructive"
                      />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {showAbsenceTypeForm && (
            <Modal
              title={
                absenceTypeEditId !== null
                  ? "Editar Tipo de Falta"
                  : "Novo Tipo de Falta"
              }
              subtitle="Parametrização do tipo de ausência"
              onClose={() => setShowAbsenceTypeForm(false)}
            >
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={absenceTypeName}
                    onChange={(e) => setAbsenceTypeName(e.target.value)}
                    placeholder="Ex: Consulta Médica"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/10">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Requer documento comprovativo
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ativa o upload obrigatório no registo da falta
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAbsenceTypeRequiresDoc((v) => !v)}
                    className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                      absenceTypeRequiresDoc ? "bg-accent" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        absenceTypeRequiresDoc ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveAbsenceType}
                    disabled={!absenceTypeName.trim()}
                    className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors"
                  >
                    {absenceTypeEditId !== null ? "Guardar Alterações" : "Criar Tipo"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAbsenceTypeForm(false)}
                    className="px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </>
      )}
    </div>
  );
}

