import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle,
  FileText,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  Settings,
  Shield,
  ShieldCheck,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  UserX,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  AGRUPAMENTO,
  schools as INITIAL_SCHOOLS,
  absenceTypes as INITIAL_ABSENCE_TYPES,
  INITIAL_ADMINS,
} from "../../api/mockData";
import usersService from "../../api/services/users.service";
import type { School, AbsenceType, AdminUser, EntityId } from "../../types";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import Modal from "../common/Modal";

export default function PlatformSettingsPage() {
  const [activeTab, setActiveTab] = useState<"schools" | "users" | "absence-types">("schools");

  // ── Schools state ─────────────────────────────────────────────────────────
  const [schoolsList, setSchoolsList] = useState<School[]>(
    INITIAL_SCHOOLS.map((s) => ({ ...s }))
  );
  const [showSchoolForm, setShowSchoolForm] = useState(false);
  const [schoolEditId, setSchoolEditId] = useState<EntityId | null>(null);
  const [schoolDeleteConfirm, setSchoolDeleteConfirm] = useState<EntityId | null>(
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
          id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
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

  function toggleSchoolActive(id: EntityId) {
    setSchoolsList((p) =>
      p.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    );
  }

  function deleteSchool(id: EntityId) {
    setSchoolsList((p) => p.filter((s) => s.id !== id));
    setSchoolDeleteConfirm(null);
  }

  // ── Absence types state ───────────────────────────────────────────────────
  const [absenceTypesList, setAbsenceTypesList] = useState<AbsenceType[]>(
    INITIAL_ABSENCE_TYPES.map((t) => ({ ...t }))
  );
  const [showAbsenceTypeForm, setShowAbsenceTypeForm] = useState(false);
  const [absenceTypeEditId, setAbsenceTypeEditId] = useState<EntityId | null>(null);
  const [absenceTypeDeleteConfirm, setAbsenceTypeDeleteConfirm] = useState<EntityId | null>(null);
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
          id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
          name: absenceTypeName,
          requiresDocument: absenceTypeRequiresDoc,
          requires_document: absenceTypeRequiresDoc,
        },
      ]);
    }
    setShowAbsenceTypeForm(false);
  }

  function deleteAbsenceType(id: EntityId) {
    setAbsenceTypesList((p) => p.filter((t) => t.id !== id));
    setAbsenceTypeDeleteConfirm(null);
  }

  // ── Admins state ──────────────────────────────────────────────────────────
  const [adminsList, setAdminsList] = useState<AdminUser[]>(
    INITIAL_ADMINS.map((a) => ({ ...a }))
  );
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminEditId, setAdminEditId] = useState<EntityId | null>(null);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminActive, setAdminActive] = useState(true);

  // Status toggle confirm modal state
  const [adminStatusConfirm, setAdminStatusConfirm] = useState<AdminUser | null>(null);

  // Delete confirm modal state
  const [adminDeleteConfirm, setAdminDeleteConfirm] = useState<AdminUser | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchUsers() {
      try {
        setLoadingAdmins(true);
        const res = await usersService.getAll();
        if (isMounted && res?.data && Array.isArray(res.data)) {
          const mapped: AdminUser[] = res.data
            .filter((u) => !u.role || u.role === "admin")
            .map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              role: (u.role as "admin") || "admin",
              is_active: u.is_active,
              active: u.is_active,
              created_at: u.created_at ? new Date(u.created_at).toLocaleDateString("pt-PT") : undefined,
            }));
          if (mapped.length > 0) {
            setAdminsList(mapped);
          }
        }
      } catch (err) {
        console.warn("Backend users API not ready, using local data fallback:", err);
      } finally {
        if (isMounted) setLoadingAdmins(false);
      }
    }
    fetchUsers();
    return () => {
      isMounted = false;
    };
  }, []);

  function openAddAdmin() {
    setAdminName("");
    setAdminEmail("");
    setAdminActive(true);
    setAdminEditId(null);
    setShowAdminForm(true);
  }

  function openEditAdmin(admin: AdminUser) {
    setAdminName(admin.name);
    setAdminEmail(admin.email);
    setAdminActive(admin.is_active ?? admin.active ?? true);
    setAdminEditId(admin.id);
    setShowAdminForm(true);
  }

  async function handleSaveAdmin() {
    if (!adminName.trim() || !adminEmail.trim()) return;
    const isEditing = adminEditId !== null;

    if (isEditing) {
      try {
        await usersService.update(adminEditId, {
          name: adminName.trim(),
          email: adminEmail.trim(),
          is_active: adminActive,
        });
      } catch (err) {
        console.warn("API update failed, updating local state:", err);
      }

      setAdminsList((prev) =>
        prev.map((a) =>
          a.id === adminEditId
            ? {
                ...a,
                name: adminName.trim(),
                email: adminEmail.trim(),
                active: adminActive,
                is_active: adminActive,
              }
            : a
        )
      );
      toast.success("Administrador atualizado com sucesso");
    } else {
      let createdId: EntityId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `admin-${Date.now()}`;

      try {
        const res = await usersService.create({
          name: adminName.trim(),
          email: adminEmail.trim(),
          is_active: adminActive,
        });
        if (res?.data?.id) {
          createdId = res.data.id;
        }
      } catch (err) {
        console.warn("API create failed, saving to local state:", err);
      }

      const newAdmin: AdminUser = {
        id: createdId,
        name: adminName.trim(),
        email: adminEmail.trim(),
        role: "admin",
        active: adminActive,
        is_active: adminActive,
        created_at: new Date().toLocaleDateString("pt-PT"),
      };
      setAdminsList((prev) => [...prev, newAdmin]);
      toast.success("Administrador criado com sucesso");
    }
    setShowAdminForm(false);
  }

  async function handleConfirmStatusToggle() {
    if (!adminStatusConfirm) return;
    const target = adminStatusConfirm;
    const currentActive = target.is_active ?? target.active ?? true;
    const newStatus = !currentActive;

    try {
      if (!newStatus) {
        // Deactivating calls DELETE /api/users/{id} in Laravel UserController
        await usersService.delete(target.id);
      } else {
        await usersService.update(target.id, { is_active: true });
      }
    } catch (err) {
      console.warn("API status toggle failed, updating local state:", err);
    }

    setAdminsList((prev) =>
      prev.map((a) =>
        a.id === target.id
          ? { ...a, active: newStatus, is_active: newStatus }
          : a
      )
    );
    toast.success(newStatus ? "Administrador reativado" : "Administrador inativado");
    setAdminStatusConfirm(null);
  }

  async function handleConfirmDeleteAdmin() {
    if (!adminDeleteConfirm) return;
    const targetId = adminDeleteConfirm.id;

    try {
      await usersService.delete(targetId);
    } catch (err) {
      console.warn("API delete failed, removing from local state:", err);
    }

    setAdminsList((prev) => prev.filter((a) => a.id !== targetId));
    toast.success("Administrador removido");
    setAdminDeleteConfirm(null);
  }

  const TABS = [
    {
      id: "schools" as const,
      label: "Escolas",
      icon: <Building2 size={14} />,
    },
    {
      id: "users" as const,
      label: "Administradores",
      icon: <ShieldCheck size={14} />,
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border">
          {[
            {
              label: "Escolas Ativas",
              value: schoolsList.filter((s) => s.active).length,
            },
            {
              label: "Administradores",
              value: adminsList.filter((a) => a.active).length,
            },
            {
              label: "Assistentes",
              value: schoolsList.reduce((a, s) => a + s.assistants, 0),
            },
            { label: "Total Escolas", value: schoolsList.length },
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

      {/* Tab: Administradores */}
      {activeTab === "users" && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Utilizadores Administradores
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gestão de utilizadores com permissões de administração do agrupamento
              </p>
            </div>
            <button
              type="button"
              onClick={openAddAdmin}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs"
            >
              <UserPlus size={13} />
              Novo Administrador
            </button>
          </div>

          <div className="space-y-3">
            {adminsList.map((admin) => (
              <div
                key={admin.id}
                className={`p-4 rounded-xl border transition-colors ${
                  admin.active
                    ? "border-border bg-card"
                    : "border-border/50 bg-muted/20 opacity-80"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 font-mono shadow-xs ${
                      admin.active
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-muted text-muted-foreground border border-border"
                    }`}
                  >
                    {admin.name
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className={`text-sm font-semibold ${
                          admin.active
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {admin.name}
                      </p>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          admin.active
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : "bg-muted text-muted-foreground border border-border"
                        }`}
                      >
                        {admin.active ? "Ativo" : "Inativo"}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary border border-primary/20">
                        Administrador
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Mail size={12} className="text-muted-foreground/70" />
                        <span className="font-mono">{admin.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
                      {admin.created_at && (
                        <span>Registado em: {admin.created_at}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditAdmin(admin)}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdminStatusConfirm(admin)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        admin.active
                          ? "hover:bg-amber-500/10 text-muted-foreground hover:text-amber-600"
                          : "hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600"
                      }`}
                      title={admin.active ? "Inativar utilizador" : "Ativar utilizador"}
                    >
                      {admin.active ? (
                        <UserX size={14} />
                      ) : (
                        <UserCheck size={14} />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdminDeleteConfirm(admin)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Eliminar utilizador"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Modal: Criar / Editar Administrador */}
          {showAdminForm && (
            <Modal
              title={adminEditId !== null ? "Editar Administrador" : "Novo Administrador"}
              subtitle="Preencha os dados de acesso e identificação"
              onClose={() => setShowAdminForm(false)}
            >
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1.5">
                    Nome Completo <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Ex: Miguel Silva"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground block mb-1.5">
                    Email Institucional <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@sgde.pt"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/10">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Conta Ativa
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Permite acesso imediato ao painel de administração
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdminActive((v) => !v)}
                    className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                      adminActive ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        adminActive ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveAdmin}
                    disabled={!adminName.trim() || !adminEmail.trim()}
                    className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors shadow-xs"
                  >
                    {adminEditId !== null ? "Guardar Alterações" : "Criar Administrador"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAdminForm(false)}
                    className="px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </Modal>
          )}

          {/* Modal: Confirmar Alteração de Estado (Inativar / Ativar) */}
          {adminStatusConfirm && (
            <Modal
              title={adminStatusConfirm.active ? "Inativar Administrador" : "Reativar Administrador"}
              subtitle={adminStatusConfirm.name}
              onClose={() => setAdminStatusConfirm(null)}
            >
              <div className="space-y-4">
                <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                  adminStatusConfirm.active
                    ? "bg-amber-500/10 border-amber-500/25 text-amber-800 dark:text-amber-300"
                    : "bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-300"
                }`}>
                  {adminStatusConfirm.active ? (
                    <AlertTriangle size={18} className="flex-shrink-0 text-amber-600 mt-0.5" />
                  ) : (
                    <CheckCircle size={18} className="flex-shrink-0 text-emerald-600 mt-0.5" />
                  )}
                  <div className="text-xs leading-relaxed">
                    {adminStatusConfirm.active ? (
                      <>
                        Tem a certeza que pretende inativar o administrador{" "}
                        <strong>{adminStatusConfirm.name}</strong> ({adminStatusConfirm.email})?
                        Enquanto a conta estiver inativa, o utilizador ficará bloqueado e não conseguirá iniciar sessão no sistema.
                      </>
                    ) : (
                      <>
                        Deseja reativar o acesso de{" "}
                        <strong>{adminStatusConfirm.name}</strong> ({adminStatusConfirm.email})?
                        O utilizador voltará a ter permissões de administração na plataforma.
                      </>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleConfirmStatusToggle}
                    className={`flex-1 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors shadow-xs ${
                      adminStatusConfirm.active
                        ? "bg-amber-600 hover:bg-amber-700"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {adminStatusConfirm.active ? "Confirmar Inativação" : "Confirmar Reativação"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminStatusConfirm(null)}
                    className="px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </Modal>
          )}

          {/* Modal: Confirmar Eliminação de Administrador */}
          {adminDeleteConfirm && (
            <Modal
              title="Eliminar Administrador"
              subtitle="Esta ação é permanente"
              onClose={() => setAdminDeleteConfirm(null)}
            >
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-xs leading-relaxed flex items-start gap-3">
                  <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                  <div>
                    Tem a certeza que pretende eliminar permanentemente o administrador{" "}
                    <strong>{adminDeleteConfirm.name}</strong> ({adminDeleteConfirm.email})?
                    Esta conta será removida da plataforma e todos os acessos serão revogados.
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleConfirmDeleteAdmin}
                    className="flex-1 py-2.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors shadow-xs"
                  >
                    Eliminar Definitivamente
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminDeleteConfirm(null)}
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

